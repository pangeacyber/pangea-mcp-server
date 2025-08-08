import type { FastMCP } from 'fastmcp';
import { FileIntelService, PangeaConfig } from 'pangea-node-sdk';
import { z } from 'zod';

import { aiGuard } from '../guard.js';
import type { FastMCPSessionAuth, ServerContext } from '../types.js';

export function registerFileIntelTools<
  T extends FastMCPSessionAuth = FastMCPSessionAuth,
>({ server, context }: { server: FastMCP<T>; context: ServerContext }) {
  const lookupFileReputationParameters = z.object({
    hashType: z
      .enum(['sha256', 'sha', 'md5'])
      .describe('The type of hash to look up'),
    hashes: z
      .array(z.string())
      .min(1)
      .max(100)
      .describe('The file hashes to be looked up'),
  });
  server.addTool({
    name: 'lookup_file_reputation',
    description: 'Retrieve a reputation score for a set of file hashes',
    parameters: lookupFileReputationParameters,
    execute: aiGuard<T, typeof lookupFileReputationParameters>(
      context,
      async ({ hashType, hashes }) => {
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
      }
    ),
  });
}
