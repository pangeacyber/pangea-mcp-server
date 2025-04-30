# Pangea MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction)
server that provides integration with Pangea APIs.

## Prerequisites

- Node.js v22.14.0 or greater.
- A Pangea API token with access to all of Domain Intel, Embargo, IP Intel,
  Redact, and URL Intel.

## Installation

First build the project from source:

```shell
$ git clone https://github.com/pangeacyber/pangea-mcp-server.git
$ cd pangea-mcp-server
$ npm install
```

Then configure a MCP client like Claude Desktop or VS Code to run the server.

### Usage with Claude Desktop

Edit the following configuration file (create it if it does not exist):

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Replace (or merge) the file contents with the following, updating the path and
the Pangea API token:

```json
{
  "mcpServers": {
    "pangea": {
      "command": "node",
      "args": ["/path/to/pangea-mcp-server/dist/index.js"],
      "env": {
        "PANGEA_TOKEN": "pts_00000000000000000000000000000000"
      }
    }
  }
}
```

Then restart Claude Desktop. Upon restarting, there should be a hammer icon
below the text input box. Clicking the hammer icon should display a list of the
tools that come with the Pangea MCP server.

## Tools

### Domain Intel

- **lookup-domain-reputation** — Look up reputation score(s) for one or more domains.
- **whois** — Retrieve who is for a domain.

### Embargo

- **check-ip-embargo** — Check an IP addresses against known sanction and trade embargo lists.
- **check-iso-code-embargo** — Check a country code against known sanction and trade embargo lists.

### File Intel

- **lookup-file-reputation** — Retrieve a reputation score for a set of file hashes.

### IP Intel

- **lookup-ip-address-reputation** — Look up reputation score(s) for one or more IP addresses.
- **lookup-domain-from-ip-address** — Retrieve the domain name associated with one or more IP addresses.
- **is-proxy** — Determine if one or more IP addresses originate from a proxy.
- **is-vpn** — Determine if one or more IP addresses originate from a VPN.
- **geolocate** — Retrieve location information associated with one or more IP addresses.

### Prompt Guard

- **prompt-guard** — Detect malicious prompts including direct or indirect prompt injection attacks and jailbreak attempts.

### Redact

- **redact** — Redact sensitive information from provided text.

### URL Intel

- **lookup-url-reputation** — Look up reputation score(s) for one or more URLs.
