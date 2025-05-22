import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { AIGuardService, PangeaConfig } from 'pangea-node-sdk';
import type { ZodRawShape } from 'zod';

import type { ServerContext } from './types.js';

export function aiGuard<Args extends ZodRawShape>(
  context: ServerContext,
  cb: ToolCallback<Args>
): ToolCallback<Args> {
  const client = new AIGuardService(
    context.apiToken,
    new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
  );

  // @ts-expect-error
  return async (
    args: Args,
    extra: RequestHandlerExtra<ServerRequest, ServerNotification>
  ) => {
    const input = JSON.stringify(args);

    const guardedInput = await client.guardText({
      text: input,
      recipe: 'pangea_agent_pre_tool_guard',
    });

    if (!guardedInput.success) {
      throw new Error('Failed to guard input.');
    }

    if (guardedInput.result.blocked) {
      throw new Error('Input has been blocked by AI Guard.');
    }

    const result = await cb(args, extra);

    // AI Guard can only guard text content.
    if (!result.content || result.content.some(({ type }) => type !== 'text')) {
      return result;
    }

    const guardedOutput = await client.guardText({
      text: JSON.stringify(result),
      recipe: 'pangea_agent_post_tool_guard',
    });

    if (!guardedOutput.success) {
      throw new Error('Failed to guard output.');
    }

    if (guardedOutput.result.blocked) {
      throw new Error('Output has been blocked by AI Guard.');
    }

    return guardedOutput.result.prompt_text
      ? (JSON.parse(guardedOutput.result.prompt_text) as CallToolResult)
      : result;
  };
}
