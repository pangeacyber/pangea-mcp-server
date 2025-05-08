# Contributing

## Local development

First build the project from source:

```shell
$ git clone https://github.com/pangeacyber/pangea-mcp-server.git
$ cd pangea-mcp-server
$ npm install
$ npm run build
```

Then configure a MCP client like Claude Desktop or VS Code to run the server:

```json
{
  "mcpServers": {
    "pangea": {
      "command": "node",
      "args": ["/path/to/pangea-mcp-server/dist/index.js"],
      "env": {
        "PANGEA_VAULT_TOKEN": "pts_00000000000000000000000000000000",
        "PANGEA_VAULT_ITEM_ID": "pvi_00000000000000000000000000000000",
        "PANGEA_AUDIT_CONFIG_ID": "pci_00000000000000000000000000000000"
      }
    }
  }
}
```
