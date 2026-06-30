# @zapier/google-docs-connector

_Independent, unofficial connector for Google Docs. Not affiliated with, endorsed by, or sponsored by Google Docs. "Google Docs" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable Google Docs tools wrapping the [Google Docs API v1](https://developers.google.com/workspace/docs/api/reference/rest) (`https://docs.googleapis.com/v1/`) for document content and the [Google Drive API v3](https://developers.google.com/workspace/drive/api/reference/rest/v3/files) (`https://www.googleapis.com/drive/v3/`) for find / export / copy-template / folder operations: create documents (blank, from text/Markdown, or from a template), read structured content and tabs, export as text/Markdown, find documents by name, and edit content — append / insert / find-and-replace / delete text, locate text positions, apply character and paragraph formatting, make bulleted/numbered lists, insert and edit tables, create headers/footers/footnotes, insert and replace inline images, and set page style. 22 tools. Auth is a single Google OAuth 2.0 access token, resolved either from an environment variable (direct mode) or through a Zapier-managed connection.

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

## When to use this

Reach for this connector when an agent needs to act on Google Docs documents directly: drafting a new document from text or Markdown, filling a templated document, reading a document's content (prefer `exportDocument` markdown for reading, `getDocument` for editing at a position), or making targeted edits — text, find-and-replace, formatting, images, or page style. `findDocuments` resolves a human-named document to the id every other tool needs.

## When NOT to use this

- **Binary file upload / conversion** (uploading a `.docx` and converting to a Doc) — that's a Drive job; use a Drive connector.
- **Managing comments or suggestions** (creating/resolving comments, accepting/rejecting suggested edits) — not exposed here; `getDocument` can _read_ suggested edits via `suggestionsViewMode`, but there is no write tool.
- **Spreadsheets or presentations** — use a Google Sheets / Slides connector.
- **Polling for document changes** — connectors are non-trigger; there is no change feed.

## Install

```bash
# Run a script with zero install — npx fetches the package on first use
export <ENV_VAR>=xxx
npx @zapier/google-docs-connector@latest run <script> '<input-json>' --connection env:<ENV_VAR>

# Install as a dependency to import the functions in your own code
npm install @zapier/google-docs-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills zapier/connectors --skill google-docs
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection`. The value is a _selector_, not the secret: `--connection zapier:<connection-id>` routes through Zapier-managed auth (recommended; no third-party secret enters the agent's environment, and the connection id isn't itself a secret so you can pass it as-is), and `--connection env:<ENV_VAR>` reads a direct token from `$<ENV_VAR>` (the token stays in `env`, never on argv). The `<resolver>:` prefix is optional — a bare value is claimed by the first matching resolver. See [`SKILL.md`](SKILL.md#auth) for tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "google-docs": {
      "command": "npx",
      "args": ["@zapier/google-docs-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

## Scripts

| Script                       | Description                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `createDocument`             | Create a new document, optionally with initial text/Markdown and in a folder.              |
| `createDocumentFromTemplate` | Copy a template document and fill its `{{placeholder}}` tokens.                            |
| `getDocument`                | Read a document's structured content, tabs, and edit indices.                              |
| `exportDocument`             | Export a document as plain text or Markdown.                                               |
| `findDocuments`              | Find Google Docs documents by name and/or folder (the id-resolution entry point).          |
| `appendText`                 | Append text (optionally Markdown) to the end of a document.                                |
| `insertText`                 | Insert text at a specific index.                                                           |
| `replaceAllText`             | Find and replace all occurrences of a string.                                              |
| `findText`                   | Locate occurrences of a phrase and return their index ranges.                              |
| `deleteContentRange`         | Delete the content in an index range.                                                      |
| `formatText`                 | Apply character formatting to an index range.                                              |
| `formatParagraph`            | Set paragraph style (heading, alignment, spacing, indentation) on a range.                 |
| `createList`                 | Make a range a bulleted or numbered list, or convert between the two.                      |
| `removeListFormatting`       | Remove bullets/numbering from a range, leaving the text.                                   |
| `insertImage`                | Insert an inline image from a public URL.                                                  |
| `replaceImage`               | Replace an existing inline image with a new one.                                           |
| `updateDocumentStyle`        | Set page size, margins, or background color.                                               |
| `insertTable`                | Insert a rows×columns table, optionally seeded with cell contents.                         |
| `modifyTable`                | Add or remove a table row or column at a reference cell.                                   |
| `createHeader`               | Create the default header with its text; returns the segmentId for styling via formatText. |
| `createFooter`               | Create the default footer with its text; returns the segmentId for styling via formatText. |
| `createFootnote`             | Insert a footnote reference; returns its segmentId for insertText.                         |

Run `npx @zapier/google-docs-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:<ENV_VAR>" }`.

```ts
import { findDocuments, exportDocument } from "@zapier/google-docs-connector";

// Each named export is the consumer-facing (input, opts) => Promise<{ data, meta }>.
const { data } = await exportDocument(
  { documentId: "1AbC...", format: "markdown" },
  { connection: "env:GOOGLE_DOCS_ACCESS_TOKEN" },
);
console.log(data.content); // the document as Markdown
```

`meta.outputDataValidation` reports whether any API fields were stripped against the script's `outputSchema`; pass `{ skipOutputDataValidation: true }` in the run options to get the raw result. See [`SKILL.md`](SKILL.md#output-format) for the full envelope contract.

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Google Docs API reference](https://developers.google.com/workspace/docs/api/reference/rest) — the upstream API this connector wraps
- [Source](https://github.com/zapier/connectors/tree/main/apps/google-docs)

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Google Docs's API, services, data, schemas, documentation, or other materials, which remain the property of Google Docs. Your use of Google Docs's API is governed by your own agreement with Google Docs.

**Trademarks and affiliation.** Google Docs and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Google Docs.

**Your responsibility.** This connector calls Google Docs's API using credentials you supply. You are responsible for holding a valid Google Docs account, for complying with Google Docs's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Google Docs product. Zapier is not responsible for changes Google Docs makes to its API or for any consequence of your use of Google Docs's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
