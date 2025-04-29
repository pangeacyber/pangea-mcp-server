import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { EmbargoService, PangeaConfig } from 'pangea-node-sdk';
import { z } from 'zod';

import { aiGuard } from '../guard.js';
import type { ServerContext } from '../types.js';

export function registerEmbargoTools({
  server,
  context,
}: { server: McpServer; context: ServerContext }) {
  server.tool(
    'check-ip-embargo',
    'Check an IP addresses against known sanction and trade embargo lists',
    {
      ip: z
        .string()
        .ip()
        .describe(
          'Geolocate this IP and check the corresponding country against the enabled embargo lists'
        ),
    },
    aiGuard<{
      ip: z.ZodString;
    }>(context, async ({ ip }) => {
      const embargo = new EmbargoService(
        context.apiToken,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
      );
      const response = await embargo.ipCheck(ip);

      if (!response.success) {
        return {
          content: [
            {
              type: 'text',
              text: 'Failed to retrieve embargo data',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response.result.sanctions, null, 2),
          },
        ],
      };
    })
  );

  server.tool(
    'check-iso-code-embargo',
    'Check a country code against known sanction and trade embargo lists',
    {
      isoCode: z
        .string()
        .length(2)
        .describe(
          'The two character country ISO code to check against the enabled embargo lists'
        ),
    },
    aiGuard<{
      isoCode: z.ZodString;
    }>(context, async ({ isoCode }) => {
      const embargo = new EmbargoService(
        context.apiToken,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
      );
      const response = await embargo.isoCheck(isoCode);

      if (!response.success) {
        return {
          content: [
            {
              type: 'text',
              text: 'Failed to retrieve domains',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response.result.sanctions, null, 2),
          },
        ],
      };
    })
  );
}
