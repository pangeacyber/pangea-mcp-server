import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerDomainIntelTools } from './tools/domain-intel.js';
import { registerEmbargoTools } from './tools/embargo.js';
import { registerFileIntelTools } from './tools/file-intel.js';
import { registerIpIntelTools } from './tools/ip-intel.js';
import { registerPromptGuardTools } from './tools/prompt-guard.js';
import { registerRedactTools } from './tools/redact.js';
import { registerUrlIntelTools } from './tools/url-intel.js';
import type { ServerContext } from './types.js';

function configureServer({
  server,
  context,
}: { server: McpServer; context: ServerContext }) {
  registerDomainIntelTools({ server, context });
  registerEmbargoTools({ server, context });
  registerFileIntelTools({ server, context });
  registerIpIntelTools({ server, context });
  registerPromptGuardTools({ server, context });
  registerRedactTools({ server, context });
  registerUrlIntelTools({ server, context });
}

async function main() {
  const server = new McpServer({ name: 'Pangea MCP', version: '0.0.0' });
  const transport = new StdioServerTransport();
  configureServer({ server, context: { apiToken: process.env.PANGEA_TOKEN! } });
  await server.connect(transport);
}

main();
