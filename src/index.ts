#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { PangeaConfig, VaultService } from 'pangea-node-sdk';
import { registerAiGuardTools } from './tools/ai-guard.js';
import { registerDomainIntelTools } from './tools/domain-intel.js';
import { registerEmbargoTools } from './tools/embargo.js';
import { registerFileIntelTools } from './tools/file-intel.js';
import { registerIpIntelTools } from './tools/ip-intel.js';
import { registerRedactTools } from './tools/redact.js';
import { registerSecureAuditLogTools } from './tools/secure-audit-log.js';
import { registerUrlIntelTools } from './tools/url-intel.js';
import { registerVaultTools } from './tools/vault.js';
import type { ServerContext } from './types.js';

function configureServer({
  server,
  context,
}: {
  server: McpServer;
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

async function main() {
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

  const server = new McpServer({ name: 'Pangea MCP', version: '0.1.0' });
  const transport = new StdioServerTransport();
  configureServer({
    server,
    context: {
      apiToken: response.result.item_versions[0].token!,
      auditConfigId: process.env.PANGEA_AUDIT_CONFIG_ID!,
    },
  });
  await server.connect(transport);
}

main();
