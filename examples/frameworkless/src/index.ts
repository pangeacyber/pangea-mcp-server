import { Anthropic } from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources.mjs';
import dotenv from '@dotenvx/dotenvx';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { defineCommand, runMain } from 'citty';
import { consola } from 'consola';

dotenv.config({ overload: true });

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set');
}

const main = defineCommand({
  args: {
    input: {
      type: 'string',
      description: 'Input to the agent.',
    },
  },
  async run({ args }) {
    // Start and connect to the MCP server.
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['../../dist/index.js'],
      env: {
        PANGEA_VAULT_TOKEN: process.env.PANGEA_VAULT_TOKEN!,
        PANGEA_VAULT_ITEM_ID: process.env.PANGEA_VAULT_ITEM_ID!,
        PANGEA_AUDIT_CONFIG_ID: process.env.PANGEA_AUDIT_CONFIG_ID!,
      },
    });

    const client = new Client({ name: 'pangea-client', version: '1.0.0' });

    try {
      // Connect to the transport.
      await client.connect(transport);

      // Get tools.
      const toolsResult = await client.listTools();
      const tools = toolsResult.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
      }));
      consola.log(
        'Connected to MCP server with tools:',
        tools.map(({ name }) => name)
      );

      const messages: MessageParam[] = [
        {
          role: 'user',
          content: args.input,
        },
      ];

      // Initial Claude API call.
      const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages,
        tools,
      });

      // Process response and handle tool calls.
      const finalText: string[] = [];

      for (const content of response.content) {
        if (content.type === 'text') {
          finalText.push(content.text);
        } else if (content.type === 'tool_use') {
          // Execute tool call.
          const toolName = content.name;
          const toolArgs = content.input as
            | { [x: string]: unknown }
            | undefined;

          const result = await client.callTool({
            name: toolName,
            arguments: toolArgs,
          });
          finalText.push(
            `[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`
          );

          // Continue conversation with tool results.
          messages.push({
            role: 'user',
            content: result.content as string,
          });

          // Get next response from Claude.
          const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1000,
            messages,
          });

          finalText.push(
            response.content[0].type === 'text' ? response.content[0].text : ''
          );
        }

        consola.log(finalText.join('\n'));
      }
    } catch (e) {
      consola.error(e);
    } finally {
      await client.close();
    }
  },
});

runMain(main);
