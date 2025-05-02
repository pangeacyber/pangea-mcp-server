import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PangeaConfig, URLIntelService } from 'pangea-node-sdk';
import { z } from 'zod';

import type { ServerContext } from '../types.js';

export function registerUrlIntelTools({
  server,
  context,
}: { server: McpServer; context: ServerContext }) {
  server.tool(
    'lookup_url_reputation',
    'Look up reputation score(s) for one or more URLs.',
    {
      urls: z
        .array(z.string().url())
        .min(1)
        .max(100)
        .describe('The URLs to be looked up'),
    },

    // Not running AI Guard for this tool because the recipes will block
    // malicious URLs, which are exactly the sort of inputs and outputs that
    // this tool wants to be dealing with.
    async ({ urls }) => {
      const urlIntel = new URLIntelService(
        context.apiToken,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
      );
      const response = await urlIntel.reputationBulk(urls);

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
        ([url, reputation]) =>
          `${url}: ${reputation.verdict} (score ${reputation.score}) (categories ${reputation.category.join(', ')})`
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
}
