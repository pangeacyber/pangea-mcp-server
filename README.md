# Pangea MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction)
server that provides integration with Pangea APIs.

![sample output](.github/assets/sample-output.png)

## Prerequisites

- Node.js v22.15.0 or greater.
- A Pangea API token with access to all of AI Guard, Domain Intel, Embargo,
  IP Intel, Redact, Secure Audit Log, and URL Intel. This token needs to be
  stored in Pangea Vault. See [Service Tokens][] for documentation on how to
  create and manage Pangea API tokens.
- A Pangea API token with access to Vault. This will be used to fetch the above
  token at runtime.
- A Pangea Secure Audit Log configuration with the "Standard Audit Log Config"
  [schema][Audit Schema]. See [Multiple Service Configurations][] for
  documentation on how to create a new Secure Audit Log configuration. Note down
  the configuration ID for later.

The first API token may look like:

![sample API token](.github/assets/services-token.png)

## Pangea setup from scratch

This section will go over how to set up a brand new Pangea account for this MCP
server.

1. Create a Pangea account at <https://pangea.cloud/signup>. During the account
   creation process, an organization (top-level group) and project
   (individual app) will be created as well. On the "Get started with a common
   service" dialog, just click on the **Skip** button to get redirected to the
   developer console.
1. In the developer console, there will be a list of services in the left hand
   panel. Click on the **Vault** service to enable it. Vault provides secure
   storage of secrets, cryptographic keys, and Pangea API tokens.
1. In the modal, there will be a prompt to create a new Pangea API token or to
   extend an existing one. Choose **Create a new token** and click on **Done**.
   This is the token that will be used later as the `PANGEA_VAULT_TOKEN`
   environment variable.
1. In the left hand panel, click on the **Secure Audit Log** service to enable
   it. Secure Audit Log provides transparent, immutable, and cryptographically
   verifiable tamperproof audit logging.
1. Continue with the default **Standard Audit Log** schema.
1. In the modal, there will be a prompt to create a new Pangea API token or to
   extend an existing one. Choose **Create a new token**. Ensure that the
   **Store token in Vault** checkbox is checked, then click **Done**.
1. The **Config ID** displayed on the destination page is what will be used
   later as the `PANGEA_AUDIT_CONFIG_ID` environment variable.
1. Now the second token that was created must be extended to the rest of
   Pangea's services. For each of the following services, click on its
   respective item in the left hand panel and, in the modal that appears, choose
   **Extend an existing token**. Select the token that was created in the
   previous step (not the first token that was created for Vault alone), then
   click **Done**.
   1. AI Guard — Protects data and interactions with LLMs.
   1. Domain Intel — Retrieves intelligence data for submitted domains.
      Supported providers: DomainTools, CrowdStrike, WhoisXML API.
   1. Embargo — Checks IPs and country codes against known sanction and trade
      embargo lists.
   1. IP Intel — IP monitoring. Supported providers: Team CYMRU, CrowdStrike,
      Digital Element.
   1. Redact — Controls sensitive information by performing redaction using
      defined rules.
   1. URL Intel — Retrieves intelligence about known URLs. Supported provider:
      CrowdStrike.
1. Navigate to <https://console.pangea.cloud/project/credentials>. The token
   that has been extended to all of the above services should be displayed with
   a "Stored" indicator under the Vault column. Click on that to navigate
   straight to the Vault item that contains that token. The **ID** of this item
   is what will be used as the `PANGEA_VAULT_ITEM_ID` environment variable.

## Installation

First build the project from source:

```shell
$ git clone https://github.com/pangeacyber/pangea-mcp-server.git
$ cd pangea-mcp-server
$ npm install
$ npm run build
```

Then configure a MCP client like Claude Desktop or VS Code to run the server.

### Usage with Claude Desktop

Edit the following configuration file (create it if it does not exist):

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Replace (or merge) the file contents with the following:

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

1. Update the `/path/to/` path to point to the location of the Pangea MCP
   server.
2. Update the `PANGEA_VAULT_TOKEN` value to the Pangea Vault API token.
3. Update the `PANGEA_VAULT_ITEM_ID` value to the Vault item ID that contains
   the API token that will be used to call all other Pangea services.
4. Update the `PANGEA_AUDIT_CONFIG_ID` value to the Secure Audit Log
   configuration ID.
5. Restart Claude Desktop.

## Tools

### AI Guard

- **prompt_guard** — Analyze and redact text to avoid manipulation of the model, addition of malicious content, and other undesirable data transfers.

### Domain Intel

- **lookup_domain_reputation** — Look up reputation score(s) for one or more domains.
- **whois** — Retrieve WHOIS (an Internet resource's registered users or assignees) for a domain.

### Embargo

- **check_ip_embargo** — Check one or more IP addresses against known sanction and trade embargo lists.
- **check_iso_code_embargo** — Check a country code against known sanction and trade embargo lists.

### File Intel

- **lookup_file_reputation** — Retrieve a reputation score for a set of file hashes.

### IP Intel

- **lookup_ip_address_reputation** — Look up reputation score(s) for one or more IP addresses.
- **lookup_domain_from_ip_address** — Retrieve the domain name associated with one or more IP addresses.
- **is_proxy** — Determine if one or more IP addresses originate from a proxy.
- **is_vpn** — Determine if one or more IP addresses originate from a VPN.
- **geolocate** — Geolocate, or retrieve location information associated with, one or more IP addresses.

### Redact

- **redact** — Redact sensitive information from provided text.

### Secure Audit Log

- **log_entry** — Create a log entry in the Secure Audit Log.
- **search_log** — Search the Secure Audit Log.

### URL Intel

- **lookup_url_reputation** — Look up reputation score(s) for one or more URLs.

[Service Tokens]: https://pangea.cloud/docs/admin-guide/projects/credentials#service-tokens
[Audit Schema]: https://pangea.cloud/docs/audit/getting-started/configuration#audit-schema
[Multiple Service Configurations]: https://pangea.cloud/docs/audit/getting-started/multiple-configurations
