import type { FastMCP } from 'fastmcp';
import { DomainIntelService, PangeaConfig } from 'pangea-node-sdk';
import { z } from 'zod';

import { aiGuard } from '../guard.js';
import type { FastMCPSessionAuth, ServerContext } from '../types.js';

export function registerDomainIntelTools<
  T extends FastMCPSessionAuth = FastMCPSessionAuth,
>({ server, context }: { server: FastMCP<T>; context: ServerContext }) {
  const lookupDomainReputationParameters = z.object({
    domains: z
      .array(z.string())
      .min(1)
      .max(100)
      .describe('The domains to be looked up'),
  });
  server.addTool({
    name: 'lookup_domain_reputation',
    description: 'Look up reputation score(s) for one or more domains.',
    parameters: lookupDomainReputationParameters,
    execute: aiGuard<T, typeof lookupDomainReputationParameters>(
      context,
      async ({ domains }) => {
        const domainIntel = new DomainIntelService(
          context.apiToken,
          new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
        );
        const response = await domainIntel.reputationBulk(domains);

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
          ([domain, reputation]) =>
            `${domain}: ${reputation.verdict} (score ${reputation.score}) (categories ${reputation.category.join(', ')})`
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

  const whoisParameters = z.object({
    domain: z.string().describe('The domain to query'),
  });
  server.addTool({
    name: 'whois',
    description:
      "Retrieve WHOIS (an Internet resource's registered users or assignees) for a domain.",
    parameters: whoisParameters,
    execute: aiGuard<T, typeof whoisParameters>(context, async ({ domain }) => {
      const domainIntel = new DomainIntelService(
        context.apiToken,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
      );
      const response = await domainIntel.whoIs(domain);

      if (!response.success) {
        return {
          content: [
            {
              type: 'text',
              text: 'Failed to query domain whois',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Domain data:\n\n${JSON.stringify(response.result.data, null, 2)}`,
          },
        ],
      };
    }),
  });
}
