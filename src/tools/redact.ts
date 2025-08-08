import type { FastMCP } from 'fastmcp';
import { PangeaConfig, RedactService } from 'pangea-node-sdk';
import { z } from 'zod';

import { aiGuard } from '../guard.js';
import type { FastMCPSessionAuth, ServerContext } from '../types.js';

export function registerRedactTools<
  T extends FastMCPSessionAuth = FastMCPSessionAuth,
>({ server, context }: { server: FastMCP<T>; context: ServerContext }) {
  const redactParameters = z.object({
    text: z.string().describe('The text data to redact'),
  });
  server.addTool({
    name: 'redact',
    description: 'Redact sensitive information from provided text.',
    parameters: redactParameters,
    execute: aiGuard<T, typeof redactParameters>(context, async ({ text }) => {
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
    }),
  });
}
