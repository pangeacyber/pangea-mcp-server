import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IPIntelService, PangeaConfig } from 'pangea-node-sdk';
import { z } from 'zod';

import { aiGuard } from '../guard.js';
import type { ServerContext } from '../types.js';

export function registerIpIntelTools({
  server,
  context,
}: { server: McpServer; context: ServerContext }) {
  server.tool(
    'lookup-ip-address-reputation',
    'Look up reputation score(s) for one or more IP addresses',
    {
      ipAddresses: z
        .array(z.string().ip())
        .min(1)
        .max(100)
        .describe('The IP addresses to be looked up'),
    },
    aiGuard<{
      ipAddresses: z.ZodArray<z.ZodString, 'many'>;
    }>(context, async ({ ipAddresses }) => {
      const ipIntel = new IPIntelService(
        context.apiToken,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
      );
      const response = await ipIntel.reputationBulk(ipAddresses);

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
        ([ipAddress, reputation]) =>
          `${ipAddress}: ${reputation.verdict} (score ${reputation.score}) (categories ${reputation.category.join(', ')})`
      );

      return {
        content: [
          {
            type: 'text',
            text: `Reputation data:\n\n${formattedReputation.join('\n')}`,
          },
        ],
      };
    })
  );

  server.tool(
    'lookup-domain-from-ip-address',
    'Retrieve the domain name associated with one or more IP addresses',
    {
      ipAddresses: z
        .array(z.string().ip())
        .min(1)
        .max(100)
        .describe('The IP addresses to be looked up'),
    },
    aiGuard<{
      ipAddresses: z.ZodArray<z.ZodString, 'many'>;
    }>(context, async ({ ipAddresses }) => {
      const ipIntel = new IPIntelService(
        context.apiToken,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
      );
      const response = await ipIntel.getDomainBulk(ipAddresses);

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

      const formattedDomains = Object.entries(response.result.data).map(
        ([ipAddress, result]) =>
          `${ipAddress}: ${result.domain_found ? result.domain : 'No domain found'}`
      );

      return {
        content: [
          {
            type: 'text',
            text: `Domain data:\n\n${formattedDomains.join('\n')}`,
          },
        ],
      };
    })
  );

  server.tool(
    'is-proxy',
    'Determine if one or more IP addresses originate from a proxy',
    {
      ipAddresses: z
        .array(z.string().ip())
        .min(1)
        .max(100)
        .describe('The IP addresses to be looked up'),
    },
    aiGuard<{
      ipAddresses: z.ZodArray<z.ZodString, 'many'>;
    }>(context, async ({ ipAddresses }) => {
      const ipIntel = new IPIntelService(
        context.apiToken,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
      );
      const response = await ipIntel.isProxyBulk(ipAddresses);

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

      const formattedResults = Object.entries(response.result.data).map(
        ([ipAddress, result]) =>
          `${ipAddress}: ${result.is_proxy ? 'Is a proxy.' : 'Is not a proxy.'}`
      );

      return {
        content: [
          {
            type: 'text',
            text: `Proxy data:\n\n${formattedResults.join('\n')}`,
          },
        ],
      };
    })
  );

  server.tool(
    'is-vpn',
    'Determine if one or more IP addresses originate from a VPN',
    {
      ipAddresses: z
        .array(z.string().ip())
        .min(1)
        .max(100)
        .describe('The IP addresses to be looked up'),
    },
    aiGuard<{
      ipAddresses: z.ZodArray<z.ZodString, 'many'>;
    }>(context, async ({ ipAddresses }) => {
      const ipIntel = new IPIntelService(
        context.apiToken,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
      );
      const response = await ipIntel.isVPNBulk(ipAddresses);

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

      const formattedResults = Object.entries(response.result.data).map(
        ([ipAddress, result]) =>
          `${ipAddress}: ${result.is_vpn ? 'Is a VPN.' : 'Is not a VPN.'}`
      );

      return {
        content: [
          {
            type: 'text',
            text: `VPN data:\n\n${formattedResults.join('\n')}`,
          },
        ],
      };
    })
  );

  server.tool(
    'geolocate',
    'Retrieve location information associated with one or more IP addresses',
    {
      ipAddresses: z
        .array(z.string().ip())
        .min(1)
        .max(100)
        .describe('The IP addresses to be looked up'),
    },
    aiGuard<{
      ipAddresses: z.ZodArray<z.ZodString, 'many'>;
    }>(context, async ({ ipAddresses }) => {
      const ipIntel = new IPIntelService(
        context.apiToken,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
      );
      const response = await ipIntel.geolocateBulk(ipAddresses);

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
            text: JSON.stringify(response.result.data, null, 2),
          },
        ],
      };
    })
  );
}
