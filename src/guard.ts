import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type {
  AudioContent,
  ContentResult,
  Context,
  ImageContent,
  ResourceContent,
  ResourceLink,
  TextContent,
  ToolParameters,
} from 'fastmcp';
import { AIGuardService, PangeaConfig } from 'pangea-node-sdk';
import { z } from 'zod';

import type { FastMCPSessionAuth, ServerContext } from './types.js';

type ToolCallback<
  T extends FastMCPSessionAuth,
  Params extends ToolParameters = ToolParameters,
> = (
  args: StandardSchemaV1.InferOutput<Params>,
  context: Context<T>
) => Promise<
  | AudioContent
  | ContentResult
  | ImageContent
  | ResourceContent
  | ResourceLink
  | string
  | TextContent
  | void
>;

const TextContentZodSchema = z
  .object({
    /** The text content of the message. */
    text: z.string(),
    type: z.literal('text'),
  })
  .strict() satisfies z.ZodType<TextContent>;

export function aiGuard<
  T extends FastMCPSessionAuth,
  Params extends ToolParameters = ToolParameters,
>(
  context: ServerContext,
  cb: ToolCallback<T, Params>
): ToolCallback<T, Params> {
  const client = new AIGuardService(
    context.apiToken,
    new PangeaConfig({ domain: 'aws.us.pangea.cloud' })
  );

  return async (args, fastmcpContext) => {
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

    const result = await cb(args, fastmcpContext);

    // AI Guard can only guard text content.
    if (!TextContentZodSchema.safeParse(result).success) {
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
