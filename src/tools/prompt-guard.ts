import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PangeaConfig, PromptGuardService } from 'pangea-node-sdk';
import { z } from 'zod';

import { aiGuard } from '../guard.js';
import type { ServerContext } from '../types.js';

export function registerPromptGuardTools({
  server,
  context,
}: { server: McpServer; context: ServerContext }) {
  const schema = {
    messages: z.array(
      z.object({
        role: z.enum(['system', 'assistant', 'user']),
        content: z.string(),
      })
    ),
  };

  server.tool(
    'prompt-guard',
    'Detect malicious prompts including direct or indirect prompt injection attacks and jailbreak attempts',
    schema,
    aiGuard<typeof schema>(context, async ({ messages }) => {
      const promptGuard = new PromptGuardService(
        context.apiToken,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
      );
      const response = await promptGuard.guard({
        messages,
        classify: true,
      });

      if (!response.success) {
        return {
          content: [
            {
              type: 'text',
              text: 'Failed to guard prompt',
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
