# @zapier/google-docs-connector

Agent-callable Google Docs tools wrapping the [Google Docs API v1](https://developers.google.com/workspace/docs/api/reference/rest) (`https://docs.googleapis.com/v1/`) for document content and the [Google Drive API v3](https://developers.google.com/workspace/drive/api/reference/rest/v3/files) (`https://www.googleapis.com/drive/v3/`) for find / export / copy-template / folder operations: create documents (blank, from text/Markdown, or from a template), read structured content and tabs, export as text/Markdown/HTML, find documents by name, and edit content — append / insert / find-and-replace / delete text, locate text positions, apply character formatting, insert and replace inline images, and set page style. 14 tools. Auth is a single Google OAuth 2.0 access token, resolved either from an environment variable (direct mode) or through a Zapier-managed connection.

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

## Install

```bash
# Run a tool with zero install — npx fetches the package on first use
GOOGLE_DOCS_ACCESS_TOKEN=ya29.xxx npx @zapier/google-docs-connector run findDocuments '{"name":"Q4 plan"}' --connection env:GOOGLE_DOCS_ACCESS_TOKEN

# Install as a dependency to import the tools in your own code
npm install @zapier/google-docs-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills zapier/connectors --skill google-docs
```

Credentials are environment-variable only (never passed on argv). Pass auth as one connection string with `--connection [<resolver>:]<value>`: `env:GOOGLE_DOCS_ACCESS_TOKEN` reads a Google OAuth access token from the environment, or `zapier:<connection-id>` routes through Zapier-managed auth (no third-party secret enters the agent's environment); see [`SKILL.md`](SKILL.md#auth) for the scope requirements and how to find a connection ID.

Requires Node.js 22.18+ or Bun 1.x on `PATH`.

## Tools

One file per tool in [`scripts/`](scripts/); each tool's `inputSchema` / `outputSchema` (Zod) is the source of truth for its contract. All tools use the single `google-docs` connection (one OAuth credential authorizes both the Docs and Drive hosts).

| Tool                         | Description                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `createDocument`             | Create a new document, optionally with initial text/Markdown and in a folder.     |
| `createDocumentFromTemplate` | Copy a template document and fill its `{{placeholder}}` tokens.                   |
| `getDocument`                | Read a document's structured content, tabs, and edit indices.                     |
| `exportDocument`             | Export a document as plain text, Markdown, or HTML.                               |
| `findDocuments`              | Find Google Docs documents by name and/or folder (the id-resolution entry point). |
| `appendText`                 | Append text (optionally Markdown) to the end of a document.                       |
| `insertText`                 | Insert text at a specific index.                                                  |
| `replaceAllText`             | Find and replace all occurrences of a string.                                     |
| `findText`                   | Locate occurrences of a phrase and return their index ranges.                     |
| `deleteContentRange`         | Delete the content in an index range.                                             |
| `formatText`                 | Apply character formatting to an index range.                                     |
| `insertImage`                | Insert an inline image from a public URL.                                         |
| `replaceImage`               | Replace an existing inline image with a new one.                                  |
| `updateDocumentStyle`        | Set page size, margins, or background color.                                      |

Run `npx @zapier/google-docs-connector run <toolName> --help` to see any tool's exact input contract + which auth env vars are set.

## Usage

```ts
import { findDocuments, exportDocument } from "@zapier/google-docs-connector";

// Each named export is the consumer-facing (input, opts) => Promise<{ data, meta }>.
const { data } = await exportDocument(
  { documentId: "1AbC...", format: "markdown" },
  { connection: "env:GOOGLE_DOCS_ACCESS_TOKEN" },
);
console.log(data.content); // the document as Markdown
```

`meta.outputDataValidation` reports whether any API fields were stripped against the tool's `outputSchema`; pass `{ skipOutputDataValidation: true }` in the run options to get the raw result. See [`SKILL.md`](SKILL.md#output-format) for the full envelope contract.

## MCP Server

Add one stanza to any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) to auto-discover the tools over stdio:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "google-docs": {
      "command": "npx",
      "args": ["@zapier/google-docs-connector", "mcp"],
      "env": {
        "GOOGLE_DOCS_ZAPIER_CONNECTION_ID": "<connection-id>"
      }
    }
  }
}
```

Swap `GOOGLE_DOCS_ZAPIER_CONNECTION_ID` for `GOOGLE_DOCS_ACCESS_TOKEN` if you don't have a Zapier account.

## When to use this

Reach for this connector when an agent needs to act on Google Docs documents directly: drafting a new document from text or Markdown, filling a templated document, reading a document's content (prefer `exportDocument` markdown for reading, `getDocument` for editing at a position), or making targeted edits — text, find-and-replace, formatting, images, or page style. `findDocuments` resolves a human-named document to the id every other tool needs.

## When NOT to use this

- **Binary file upload / conversion** (uploading a `.docx` and converting to a Doc) — that's a Drive job; use a Drive connector.
- **Authoring tables, lists (outside Markdown), headers, footers, or footnotes**, or managing comments / suggestions — not exposed here (reads include them).
- **Spreadsheets or presentations** — use a Google Sheets / Slides connector.
- **Polling for document changes** — connectors are non-trigger; there is no change feed.

## Links

- [Google Docs API reference](https://developers.google.com/workspace/docs/api/reference/rest)
- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Source](https://github.com/zapier/connectors/tree/main/apps/google-docs)
