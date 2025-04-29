import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FileIntelService, PangeaConfig } from 'pangea-node-sdk';
import { z } from 'zod';

import { aiGuard } from '../guard.js';
import type { ServerContext } from '../types.js';

export function registerFileIntelTools({
  server,
  context,
}: { server: McpServer; context: ServerContext }) {
  server.tool(
    'lookup-file-reputation',
    'Retrieve a reputation score for a set of file hashes',
    {
      hashType: z
        .enum(['sha256', 'sha', 'md5'])
        .describe('The type of hash to look up'),
      hashes: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe('The file hashes to be looked up'),
    },
    aiGuard<{
      hashType: z.ZodEnum<['sha256', 'sha', 'md5']>;
      hashes: z.ZodArray<z.ZodString, 'many'>;
    }>(context, async ({ hashType, hashes }) => {
      const fileIntel = new FileIntelService(
        context.apiToken,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
      );
      const response = await fileIntel.hashReputationBulk(hashes, hashType);

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
            text: `Reputation data:\n\n${JSON.stringify(response.result.data, null, 2)}`,
          },
        ],
      };
    })
  );
}
