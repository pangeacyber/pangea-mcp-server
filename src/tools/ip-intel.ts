import type { FastMCP } from 'fastmcp';
import { IPIntelService, PangeaConfig } from 'pangea-node-sdk';
import { z } from 'zod';

import { aiGuard } from '../guard.js';
import type { FastMCPSessionAuth, ServerContext } from '../types.js';

export function registerIpIntelTools<
  T extends FastMCPSessionAuth = FastMCPSessionAuth,
>({ server, context }: { server: FastMCP<T>; context: ServerContext }) {
  const lookupIpAddressReputationParameters = z.object({
    ipAddresses: z
      .array(z.string().ip())
      .min(1)
      .max(100)
      .describe('The IP addresses to be looked up'),
  });
  server.addTool({
    name: 'lookup_ip_address_reputation',
    description: 'Look up reputation score(s) for one or more IP addresses.',
    parameters: lookupIpAddressReputationParameters,
    execute: aiGuard<T, typeof lookupIpAddressReputationParameters>(
      context,
      async ({ ipAddresses }) => {
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
      }
    ),
  });

  const lookupDomainFromIpAddressParameters = z.object({
    ipAddresses: z
      .array(z.string().ip())
      .min(1)
      .max(100)
      .describe('The IP addresses to be looked up'),
  });
  server.addTool({
    name: 'lookup_domain_from_ip_address',
    description:
      'Retrieve the domain name associated with one or more IP addresses.',
    parameters: lookupDomainFromIpAddressParameters,
    execute: aiGuard<T, typeof lookupDomainFromIpAddressParameters>(
      context,
      async ({ ipAddresses }) => {
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
      }
    ),
  });

  const isProxyParameters = z.object({
    ipAddresses: z
      .array(z.string().ip())
      .min(1)
      .max(100)
      .describe('The IP addresses to be looked up'),
  });
  server.addTool({
    name: 'is_proxy',
    description:
      'Determine if one or more IP addresses originate from a proxy.',
    parameters: isProxyParameters,
    execute: aiGuard<T, typeof isProxyParameters>(
      context,
      async ({ ipAddresses }) => {
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
      }
    ),
  });

  const isVpnParameters = z.object({
    ipAddresses: z
      .array(z.string().ip())
      .min(1)
      .max(100)
      .describe('The IP addresses to be looked up'),
  });
  server.addTool({
    name: 'is_vpn',
    description: 'Determine if one or more IP addresses originate from a VPN.',
    parameters: isVpnParameters,
    execute: aiGuard<T, typeof isVpnParameters>(
      context,
      async ({ ipAddresses }) => {
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
      }
    ),
  });

  const geolocateParameters = z.object({
    ipAddresses: z
      .array(z.string().ip())
      .min(1)
      .max(100)
      .describe('The IP addresses to be looked up'),
  });
  server.addTool({
    name: 'geolocate',
    description:
      'Geolocate, or retrieve location information associated with, one or more IP addresses.',
    parameters: geolocateParameters,
    execute: aiGuard<T, typeof geolocateParameters>(
      context,
      async ({ ipAddresses }) => {
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
      }
    ),
  });
}
