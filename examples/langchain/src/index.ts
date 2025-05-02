import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { loadMcpTools } from '@langchain/mcp-adapters';
import { ChatOpenAI } from '@langchain/openai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { defineCommand, runMain } from 'citty';
import { consola } from 'consola';

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
      const tools = await loadMcpTools('pangea', client, {
        additionalToolNamePrefix: '',
        prefixToolNameWithServerName: false,
        throwOnLoadError: true,
      });

      // Create and run the agent.
      const model = new ChatOpenAI({ modelName: 'gpt-4o' });
      const agent = createReactAgent({ llm: model, tools });
      const agentResponse = await agent.invoke({
        messages: [{ role: 'user', content: args.input }],
      });

      for (const message of agentResponse.messages) {
        if (message instanceof HumanMessage) {
          consola.log('User:', message.content);
        } else if (message instanceof AIMessage) {
          consola.log('Assistant:', message.content);
          for (const toolCall of message.tool_calls || []) {
            consola.log(
              'Tool:',
              `${toolCall.name}(${JSON.stringify(toolCall.args)})`
            );
          }
        } else if (message instanceof ToolMessage) {
          consola.log('Tool:', `${message.name}()`, `=> ${message.content}`);
        }
      }
    } catch (e) {
      consola.error(e);
    } finally {
      await client.close();
    }
  },
});

runMain(main);
