# Using Google Ads over MCP

This is the MCP shape: this connector's scripts are exposed as MCP tools, either already loaded in your session or after a local server is registered.

## Check whether it's already loaded

Before registering anything, check whether this connector's tools are already available to you — look for a server whose tools match this connector's scripts (a harness-specific name; Claude Code, for example, prefixes it `mcp__<server-name>__<script>`). If so, skip straight to **Calling a tool** below — there's nothing to set up.

## Register the server

If it isn't loaded yet, `node cli.js mcp` serves every script as a tool over stdio. Register it as a local MCP server:

- **You can edit the client's MCP config yourself** (e.g. Claude Desktop, Cursor, Claude Code) — add an `mcpServers` entry: `command: "node"`, `args: ["cli.js", "mcp"]`, run from this directory. Run `node cli.js mcp --help` for auth options.
- **You can't edit it** — guide the user through adding that same stanza to their client's config.
- **A local server isn't possible at all** — guide the user to Zapier's remote MCP servers at <https://mcp.zapier.com> instead.

## Calling a tool

Once loaded — already, or after registering — every script is callable as an MCP tool named for it; the exact tool name is harness-specific (e.g. `mcp__google-ads__<script>` in Claude Code) — check your harness's tool list for the exact form, then call it directly with the tool's input schema.

## Auth

`--connection` is optional in the server's `args` — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` to `args` to set a default (Zapier-managed auth always works). If this connector also accepts a direct-token resolver, set it the same way — run `node cli.js mcp --help` to see every resolver this connector accepts. See [`SKILL.md`](../SKILL.md#auth) for the resolver model.

## Output

Every tool call returns the `{ data, meta }` envelope described in [`SKILL.md`](../SKILL.md#output-format) as the tool's `structuredContent`. Pass `skipOutputDataValidation: true` / `filterOutputData: "<jq>"` as tool arguments for the same escape hatches the CLI offers.
