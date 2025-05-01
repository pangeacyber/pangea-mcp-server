import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AuditService, PangeaConfig } from 'pangea-node-sdk';
import { z } from 'zod';

import { aiGuard } from '../guard.js';
import type { ServerContext } from '../types.js';

const standardAuditLogEventSchema = z
  .object({
    message: z.string().describe('A free form text field describing the event'),

    action: z
      .string()
      .optional()
      .describe('What action was performed on a record'),
    actor: z
      .string()
      .optional()
      .describe('An identifier for who the audit record is about'),
    new: z
      .string()
      .optional()
      .describe('The value of a record after it was changed'),
    old: z
      .string()
      .optional()
      .describe('The value of a record before it was changed'),
    source: z.string().optional().describe('The source of a record'),
    status: z.string().optional().describe('The status or result of the event'),
    target: z
      .string()
      .optional()
      .describe('An identifier for what the audit record is about'),
    tenant_id: z
      .string()
      .optional()
      .describe('An optional client-supplied tenant_id'),
    timestamp: z
      .string()
      .optional()
      .describe('An optional client-supplied timestamp'),
  })
  .describe('A structured record describing an auditable event.');

export function registerSecureAuditLogTools({
  server,
  context,
}: { server: McpServer; context: ServerContext }) {
  server.tool(
    'log-an-entry',
    'Create a log entry in the Secure Audit Log.',
    {
      event: standardAuditLogEventSchema,
    },
    aiGuard<{ event: typeof standardAuditLogEventSchema }>(
      context,
      async ({ event }) => {
        const audit = new AuditService(
          context.apiToken,
          new PangeaConfig({ domain: 'aws.us.pangea.cloud' }),
          undefined,
          context.auditConfigId
        );
        const response = await audit.log(event);

        if (!response.success) {
          return {
            content: [
              {
                type: 'text',
                text: 'Failed to log the entry',
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
      }
    )
  );

  server.tool(
    'search-the-log',
    [
      'Search the Secure Audit Log.',
      '',
      '<examples>',
      '### Search for the term `deactivated` across all fields',
      '',
      '```',
      "query='deactivated'",
      '```',
      '',
      '### Search events where the `actor` field contains the word `Dennis`',
      '',
      '```',
      'query=\'actor:"Dennis"\'',
      '```',
      '',
      '### Search events where the `actor` field does not include the word `Dennis`',
      '',
      '```',
      'query=\'-actor:"Dennis"\'',
      '```',
      '',
      '### Search for events where the `actor` field contains `Dennis` and the `target` contains `Security`',
      '',
      '```',
      'query=\'actor:"Dennis" AND target:"Security"\'',
      '```',
      '',
      '### Search for events where the actor is "Dennis" or "Grant" and the target is "Security"',
      '',
      '```',
      'query=\'(actor:"Dennis" OR target:"Grant") AND target:"Security"\'',
      '```',
      '',
      '</examples>',
    ].join('\n'),
    {
      query: z
        .string()
        .describe(
          'Natural search string; a space-separated list of case-sensitive values. Enclose strings in double-quotes " to include spaces (works for strings, not text). Optionally prefix with a field ID and a colon : to limit to a specific field.'
        ),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(10_000)
        .default(10)
        .describe('Maximum number of results to return.'),
      limit: z
        .number()
        .int()
        .default(10)
        .describe(
          'Number of audit records to include from the first page of the results.'
        ),
    },
    async ({ query, maxResults, limit }) => {
      const audit = new AuditService(
        context.apiToken,
        new PangeaConfig({ domain: 'aws.us.pangea.cloud' }),
        undefined,
        context.auditConfigId
      );

      const response = await audit.search(
        query,
        {
          max_results: maxResults,
          limit,
          return_context: false,
          verbose: false,
        },
        {}
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response.result),
          },
        ],
      };
    }
  );
}
