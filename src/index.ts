#!/usr/bin/env node

import { FastMCP } from 'fastmcp';
import { PangeaConfig, VaultService } from 'pangea-node-sdk';
import { createCli, type TrpcCliMeta, trpcServer } from 'trpc-cli';
import { z } from 'zod/v4';

import packageJson from '../package.json' with { type: 'json' };
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
        transport: z.enum(['stdio', 'httpStream']).default('stdio'),
        port: z.number().default(8080),
      })
    )
    .mutation(async ({ input }) => {
      if (!process.env.PANGEA_VAULT_TOKEN) {
        throw new Error('Missing environment variable: PANGEA_VAULT_TOKEN');
      }
      if (!process.env.PANGEA_VAULT_ITEM_ID) {
        throw new Error('Missing environment variable: PANGEA_VAULT_ITEM_ID');
      }

      const vault = new VaultService(
        process.env.PANGEA_VAULT_TOKEN!,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
      );
      const response = await vault.getItem({
        id: process.env.PANGEA_VAULT_ITEM_ID!,
      });
      if (!response.success) {
        throw new Error('Failed to get API token from Pangea Vault.');
      }

      const server = new FastMCP({ name: 'Pangea MCP', version: '0.1.0' });
      configureServer({
        server,
        context: {
          apiToken: response.result.item_versions[0].token!,
          auditConfigId: process.env.PANGEA_AUDIT_CONFIG_ID!,
        },
      });
      await server.start({
        transportType: input.transport,
        httpStream: { port: input.port, stateless: true },
      });

      // Keep the process alive with an unresolvable Promise.
      // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional
      await new Promise(() => {});
    }),
});

createCli({ router, version: packageJson.version }).run();
