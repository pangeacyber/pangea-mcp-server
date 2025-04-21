import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DomainIntelService, PangeaConfig } from 'pangea-node-sdk';
import { z } from 'zod';

import type { ServerContext } from '../types.js';

export function registerDomainIntelTools({
  server,
  context,
}: { server: McpServer; context: ServerContext }) {
  server.tool(
    'lookup-domain-reputation',
    'Look up reputation score(s) for one or more domains',
    {
      domains: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe('The domains to be looked up'),
    },
    async ({ domains }) => {
      const domainIntel = new DomainIntelService(
        context.apiToken,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
      );
      const response = await domainIntel.reputationBulk(domains);

      if (!response.success) {
        return {
          content: [
            {
              type: 'text',
              text: 'Failed to retrieve reputation data',
            },
          ],
        };
      }

      const formattedReputation = Object.entries(response.result.data).map(
        ([domain, reputation]) =>
          `${domain}: ${reputation.verdict} (score ${reputation.score}) (categories ${reputation.category.join(', ')})`
      );

      return {
        content: [
          {
            type: 'text',
            text: `Reputation data:\n\n${formattedReputation.join('\n')}`,
          },
        ],
      };
    }
  );

  server.tool(
    'whois',
    'Retrieve who is for a domain',
    {
      domain: z.string().describe('The domain to query'),
    },
    async ({ domain }) => {
      const domainIntel = new DomainIntelService(
        context.apiToken,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
      );
      const response = await domainIntel.whoIs(domain);

      if (!response.success) {
        return {
          content: [
            {
              type: 'text',
              text: 'Failed to query domain whois',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Domain data:\n\n${JSON.stringify(response.result.data, null, 2)}`,
          },
        ],
      };
    }
  );
}
