#!/usr/bin/env node

import { log } from '@clack/prompts';
import { clientRegistrationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/register.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import * as trpcServer from '@trpc/server';
import express from 'express';
import { FastMCP } from 'fastmcp';
import { PangeaConfig, VaultService } from 'pangea-node-sdk';
import { createCli, type TrpcCliMeta } from 'trpc-cli';
import { z } from 'zod/v4';

import packageJson from '../package.json' with { type: 'json' };
import {
  PangeaAuthNClientsStore,
  PangeaAuthNProvider,
} from './authn-provider.js';
import { registerAiGuardTools } from './tools/ai-guard.js';
import { registerDomainIntelTools } from './tools/domain-intel.js';
import { registerEmbargoTools } from './tools/embargo.js';
import { registerFileIntelTools } from './tools/file-intel.js';
import { registerIpIntelTools } from './tools/ip-intel.js';
import { registerRedactTools } from './tools/redact.js';
import { registerSecureAuditLogTools } from './tools/secure-audit-log.js';
import { registerUrlIntelTools } from './tools/url-intel.js';
import { registerVaultTools } from './tools/vault.js';
import type { FastMCPSessionAuth, ServerContext } from './types.js';

function configureServer<T extends FastMCPSessionAuth = FastMCPSessionAuth>({
  server,
  context,
}: {
  server: FastMCP<T>;
  context: ServerContext;
}) {
  registerAiGuardTools({ server, context });
  registerDomainIntelTools({ server, context });
  registerEmbargoTools({ server, context });
  registerFileIntelTools({ server, context });
  registerIpIntelTools({ server, context });
  registerRedactTools({ server, context });
  registerSecureAuditLogTools({ server, context });
  registerUrlIntelTools({ server, context });
  registerVaultTools({ server, context });
}

const t = trpcServer.initTRPC.meta<TrpcCliMeta>().create();

const router = t.router({
  start: t.procedure
    .meta({ default: true })
    .input(
      z.object({
        authn: z
          .boolean()
          .default(false)
          .describe('Whether to enable Pangea AuthN.'),
        oauthPort: z
          .number()
          .default(8000)
          .describe('Port to run the OAuth server on when using `--authn`.'),
        transport: z.enum(['stdio', 'httpStream']).default('stdio'),
        port: z
          .number()
          .default(8080)
          .describe('Port to listen on when using `--transport httpStream`.'),
      })
    )
    .mutation(async ({ input }) => {
      if (!process.env.PANGEA_VAULT_TOKEN) {
        log.error('Missing environment variable: PANGEA_VAULT_TOKEN');
        process.exit(1);
      }
      if (!process.env.PANGEA_VAULT_ITEM_ID) {
        log.error('Missing environment variable: PANGEA_VAULT_ITEM_ID');
        process.exit(1);
      }

      if (input.authn) {
        if (input.transport !== 'httpStream') {
          log.error(
            '`--authn` is only supported when combined with `--transport httpStream`'
          );
          process.exit(1);
        }

        if (!process.env.PANGEA_AUTHN_ISSUER) {
          log.error('Missing environment variable: PANGEA_AUTHN_ISSUER');
          process.exit(1);
        }
        if (!process.env.PANGEA_AUTHN_CLIENT_ID) {
          log.error('Missing environment variable: PANGEA_AUTHN_CLIENT_ID');
          process.exit(1);
        }
        if (!process.env.PANGEA_AUTHN_CLIENT_SECRET) {
          log.error('Missing environment variable: PANGEA_AUTHN_CLIENT_SECRET');
          process.exit(1);
        }
      }

      const vault = new VaultService(
        process.env.PANGEA_VAULT_TOKEN!,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
      );
      const response = await vault.getItem({
        id: process.env.PANGEA_VAULT_ITEM_ID!,
      });
      if (!response.success) {
        log.error('Failed to get API token from Pangea Vault.');
        process.exit(1);
      }
      const pangeaApiToken = response.result.item_versions[0].token!;

      const proxyApp = express();
      const proxyClientsStore = new PangeaAuthNClientsStore(
        process.env.PANGEA_AUTHN_ISSUER!,
        pangeaApiToken
      );

      const proxyProvider = new PangeaAuthNProvider({
        authnClientId: process.env.PANGEA_AUTHN_CLIENT_ID!,
        authnClientSecret: process.env.PANGEA_AUTHN_CLIENT_SECRET!,
        endpoints: {
          authorizationUrl: `${process.env.PANGEA_AUTHN_ISSUER!}/v2/oauth/authorize`,
          tokenUrl: `${process.env.PANGEA_AUTHN_ISSUER!}/v2/oauth/token`,
          revocationUrl: `${process.env.PANGEA_AUTHN_ISSUER!}/v2/oauth/token/revoke`,
        },
        getClient: async (client_id) => {
          return await proxyClientsStore.getClient(client_id);
        },
      });

      proxyApp.use(
        mcpAuthRouter({
          provider: proxyProvider,
          issuerUrl: new URL(process.env.PANGEA_AUTHN_ISSUER!),
          baseUrl: new URL(`http://localhost:${input.port}`),
        })
      );

      proxyApp.use(
        '/register',
        clientRegistrationHandler({ clientsStore: proxyClientsStore })
      );

      proxyApp.listen(input.oauthPort, () => {
        log.success(`OAuth server running on port ${input.oauthPort}`);
      });

      const server = new FastMCP({
        name: 'Pangea MCP',
        version: '0.1.0',
        oauth: input.authn
          ? {
              enabled: true,
              authorizationServer: {
                authorizationEndpoint: `http://localhost:${input.oauthPort}/authorize`,
                codeChallengeMethodsSupported: ['S256'],
                grantTypesSupported: ['authorization_code'],
                issuer: `http://localhost:${input.oauthPort}`,
                responseTypesSupported: ['code'],
                scopesSupported: ['openid'],
                registrationEndpoint: `http://localhost:${input.oauthPort}/register`,
                tokenEndpoint: `http://localhost:${input.oauthPort}/token`,
              },
            }
          : undefined,
        authenticate: async (request) => {
          const authHeader = request.headers.authorization;

          if (!authHeader?.startsWith('Bearer ')) {
            throw new Response(null, {
              status: 401,
              statusText: 'Missing or invalid authorization header',
            });
          }

          const token = authHeader.slice(7);

          try {
            return (await proxyProvider.verifyAccessToken(token)).extra;
          } catch (error) {
            log.error(`Failed to verify OAuth token: ${error}`);
            throw new Response(null, {
              status: 401,
              statusText: 'Invalid OAuth token',
            });
          }
        },
      });
      configureServer({
        server,
        context: {
          apiToken: pangeaApiToken,
          auditConfigId: process.env.PANGEA_AUDIT_CONFIG_ID!,
        },
      });
      await server.start({
        transportType: input.transport,
        httpStream: { port: input.port, stateless: true },
      });
      if (input.transport === 'httpStream') {
        log.success(`MCP server running on port ${input.port}`);
      }

      // Keep the process alive with an unresolvable Promise.
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional
      await new Promise(() => {});
    }),
});

createCli({ router, version: packageJson.version }).run();
