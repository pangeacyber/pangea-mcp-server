import type { FastMCP } from 'fastmcp';
import { EmbargoService, PangeaConfig } from 'pangea-node-sdk';
import { z } from 'zod';

import { aiGuard } from '../guard.js';
import type { FastMCPSessionAuth, ServerContext } from '../types.js';

export function registerEmbargoTools<
  T extends FastMCPSessionAuth = FastMCPSessionAuth,
>({ server, context }: { server: FastMCP<T>; context: ServerContext }) {
  const checkIpEmbargoParameters = z.object({
    ip: z
      .string()
      .ip()
      .describe(
        'Geolocate this IP and check the corresponding country against the enabled embargo lists'
      ),
  });
  server.addTool({
    name: 'check_ip_embargo',
    description:
      'Check one or more IP addresses against known sanction and trade embargo lists.',
    parameters: checkIpEmbargoParameters,
    execute: aiGuard<T, typeof checkIpEmbargoParameters>(
      context,
      async ({ ip }) => {
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
      }
    ),
  });

  const checkIsoCodeEmbargoParameters = z.object({
    isoCode: z
      .string()
      .length(2)
      .describe(
        'The two character country ISO code to check against the enabled embargo lists'
      ),
  });
  server.addTool({
    name: 'check_iso_code_embargo',
    description:
      'Check a country code against known sanction and trade embargo lists',
    parameters: checkIsoCodeEmbargoParameters,
    execute: aiGuard<T, typeof checkIsoCodeEmbargoParameters>(
      context,
      async ({ isoCode }) => {
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
      }
    ),
  });
}
