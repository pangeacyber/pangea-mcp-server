import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PangeaConfig, RedactService } from 'pangea-node-sdk';
import { z } from 'zod';

import { aiGuard } from '../guard.js';
import type { ServerContext } from '../types.js';

export function registerRedactTools({
  server,
  context,
}: {
  server: McpServer;
  context: ServerContext;
}) {
  server.tool(
    'redact',
    'Redact sensitive information from provided text.',
    {
      text: z.string().describe('The text data to redact'),
    },
    aiGuard<{
      text: z.ZodString;
    }>(context, async ({ text }) => {
      const redact = new RedactService(
        context.apiToken,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
      );
      const response = await redact.redact(text);

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

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response.result, null, 2),
          },
        ],
      };
    })
  );
}
