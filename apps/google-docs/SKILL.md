---
name: google-docs
description: Agent-callable Google Docs tools — create, read, export, and find documents; edit text, formatting, images, and page style. Use when the user mentions Google Docs or wants to create, read, search, or edit document content, even if they don't name Google Docs explicitly.
license: Elastic-2.0
compatibility: Requires Node.js 22.18+; run `npm install` in this directory first.
metadata:
  title: Google Docs
  source: https://github.com/zapier/connectors/blob/main/apps/google-docs/SKILL.md
  zapier-app-key: GoogleDocsCLIAPI
  api-docs: https://developers.google.com/workspace/docs/api/reference/rest
---

# Google Docs

_Independent, unofficial connector for Google Docs. Not affiliated with, endorsed by, or sponsored by Google Docs. "Google Docs" is a trademark of its owner, used only to identify the service this connector works with._

Tools for working with Google Docs against the [Google Docs API v1](https://developers.google.com/workspace/docs/api/reference/rest) (`https://docs.googleapis.com/v1/`) for document content, and the [Google Drive API v3](https://developers.google.com/workspace/drive/api/reference/rest/v3/files) (`https://www.googleapis.com/drive/v3/`) for the find / export / copy-template / folder operations the Docs API doesn't provide. 22 tools: create documents (blank, from text/Markdown, or from a template), read a document's structured content and tabs, export it as text/Markdown, find documents by name, and edit content — append / insert / find-and-replace / delete text, locate text positions, apply character and paragraph formatting, make bulleted/numbered lists, insert and edit tables, create headers / footers / footnotes, insert and replace inline images, and set page/margin/background style.

## When to use this connector

- An agent needs to **create** a document — blank, from initial text or Markdown, or by filling a `{{placeholder}}` template, optionally in a specific Drive folder.
- An agent needs to **read** a document — its structured content + edit indices (`getDocument`), clean text/Markdown (`exportDocument`), or to find documents by name (`findDocuments`) and locate text (`findText`).
- An agent needs to **edit text** — append, insert at a position, find-and-replace, or delete a range.
- An agent needs to **format or restyle** — apply character formatting; make bulleted or numbered lists (`createList`); set paragraph style — headings, alignment, line spacing, indentation (`formatParagraph`); insert/replace inline images; or set page size / margins / background.
- An agent needs to **structure the document** — insert a table and fill its cells (`insertTable`), add/remove table rows or columns (`modifyTable`), create a header or footer with its text (`createHeader` / `createFooter`) and style it by passing the returned `segmentId` to `formatText`, or add a footnote (`createFootnote`) and write its body via `insertText` targeting the returned `segmentId`.

## Scripts

One file per tool in [`scripts/`](scripts/); each tool's `inputSchema` / `outputSchema` (Zod) in the script file is the source of truth for its contract. All tools use the single connection `google-docs` (one OAuth credential authorizes both the Docs and Drive hosts).

| Script                                                                           | Tool name                    | Connections   | Description                                                                                |
| -------------------------------------------------------------------------------- | ---------------------------- | ------------- | ------------------------------------------------------------------------------------------ |
| [`scripts/createDocument.ts`](scripts/createDocument.ts)                         | `createDocument`             | `google-docs` | Create a new document, optionally with initial text/Markdown and in a folder.              |
| [`scripts/createDocumentFromTemplate.ts`](scripts/createDocumentFromTemplate.ts) | `createDocumentFromTemplate` | `google-docs` | Copy a template document and fill its `{{placeholder}}` tokens.                            |
| [`scripts/getDocument.ts`](scripts/getDocument.ts)                               | `getDocument`                | `google-docs` | Read a document's structured content, tabs, and edit indices.                              |
| [`scripts/exportDocument.ts`](scripts/exportDocument.ts)                         | `exportDocument`             | `google-docs` | Export a document as plain text or Markdown.                                               |
| [`scripts/findDocuments.ts`](scripts/findDocuments.ts)                           | `findDocuments`              | `google-docs` | Find Google Docs documents by name and/or folder.                                          |
| [`scripts/appendText.ts`](scripts/appendText.ts)                                 | `appendText`                 | `google-docs` | Append text (optionally Markdown) to the end of a document.                                |
| [`scripts/insertText.ts`](scripts/insertText.ts)                                 | `insertText`                 | `google-docs` | Insert text at a specific index.                                                           |
| [`scripts/replaceAllText.ts`](scripts/replaceAllText.ts)                         | `replaceAllText`             | `google-docs` | Find and replace all occurrences of a string.                                              |
| [`scripts/findText.ts`](scripts/findText.ts)                                     | `findText`                   | `google-docs` | Locate occurrences of a phrase and return their index ranges.                              |
| [`scripts/deleteContentRange.ts`](scripts/deleteContentRange.ts)                 | `deleteContentRange`         | `google-docs` | Delete the content in an index range.                                                      |
| [`scripts/formatText.ts`](scripts/formatText.ts)                                 | `formatText`                 | `google-docs` | Apply character formatting to an index range.                                              |
| [`scripts/formatParagraph.ts`](scripts/formatParagraph.ts)                       | `formatParagraph`            | `google-docs` | Set paragraph style (heading, alignment, spacing, indentation) on a range.                 |
| [`scripts/createList.ts`](scripts/createList.ts)                                 | `createList`                 | `google-docs` | Make a range a bulleted or numbered list, or convert between the two.                      |
| [`scripts/removeListFormatting.ts`](scripts/removeListFormatting.ts)             | `removeListFormatting`       | `google-docs` | Remove bullets/numbering from a range, leaving the text.                                   |
| [`scripts/insertImage.ts`](scripts/insertImage.ts)                               | `insertImage`                | `google-docs` | Insert an inline image from a public URL.                                                  |
| [`scripts/replaceImage.ts`](scripts/replaceImage.ts)                             | `replaceImage`               | `google-docs` | Replace an existing inline image with a new one.                                           |
| [`scripts/updateDocumentStyle.ts`](scripts/updateDocumentStyle.ts)               | `updateDocumentStyle`        | `google-docs` | Set page size, margins, or background color.                                               |
| [`scripts/insertTable.ts`](scripts/insertTable.ts)                               | `insertTable`                | `google-docs` | Insert a rows×columns table, optionally seeded with cell contents.                         |
| [`scripts/modifyTable.ts`](scripts/modifyTable.ts)                               | `modifyTable`                | `google-docs` | Add or remove a table row or column at a reference cell.                                   |
| [`scripts/createHeader.ts`](scripts/createHeader.ts)                             | `createHeader`               | `google-docs` | Create the default header with its text; returns the segmentId for styling via formatText. |
| [`scripts/createFooter.ts`](scripts/createFooter.ts)                             | `createFooter`               | `google-docs` | Create the default footer with its text; returns the segmentId for styling via formatText. |
| [`scripts/createFootnote.ts`](scripts/createFootnote.ts)                         | `createFootnote`             | `google-docs` | Insert a footnote reference; returns its segmentId for insertText.                         |

**Always learn a script's input contract before calling it — never guess field names, casing, or types.** Run `--help` on either entrypoint — `./scripts/<script>.ts --help` or `npx @zapier/google-docs-connector run <script> --help` — which renders `inputSchema` as JSON Schema and lists the connection flag(s) and available resolvers.

## Output format

Every script returns a `{ data, meta }` envelope (same shape across the CLI's JSON output, the imported SDK return value, and the MCP tool's `structuredContent`):

- **`data`** — the script's result (the shape declared by its `outputSchema`).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths (fields the API returned that the `outputSchema` doesn't declare) were stripped from `data`. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked API output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, set the single token `skipOutputDataValidation` — CLI: append `--skipOutputDataValidation`; MCP: pass `meta: { skipOutputDataValidation: true }` as a tool argument; SDK: pass `{ skipOutputDataValidation: true }` in the run options. Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, pass a jq expression that post-processes `data` — CLI: append `--filterOutputData '<jq>'`; MCP: pass `meta: { filterOutputData: "<jq>" }` as a tool argument. The jq runs against `data` only, NOT the `{ data, meta }` envelope. The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated. The imported SDK has no `filterOutputData` option — reshape the returned `data` in code instead.

## Disambiguation & refusals

**Disambiguation before a write.** Before editing a document you looked up by name with `findDocuments`, count the **exact case-insensitive title matches**:

- **Exactly one match** — act on it. Don't over-ask; a single unambiguous match is the answer.
- **Two or more that tie** — stop. List the tied candidates with a distinguishing field (`modifiedTime` or `url`) and ask the user which one they mean. Don't pick arbitrarily and don't edit all of them.

This also applies to index positions: indices from `getDocument` / `findText` go **stale after any edit**. Re-read before the next index-based call rather than reusing positions across edits.

**Unsupported operations — say so and stop; don't fake it with another tool.** This catalog deliberately does not:

- **Upload a binary file and convert it to a Doc**, or round-trip pasted HTML. Use a Drive connector for binary uploads; compose content natively here.
- **Manage comments or accept/reject suggestions.** `getDocument` can read suggested edits via `suggestionsViewMode`, but there is no write tool for comments or suggestions.
- **Export to PDF, DOCX, or HTML as inline content.** `exportDocument` returns plain text or Markdown only; PDF, DOCX, and HTML need a Drive download link (Drive only offers HTML as a zipped Web Page bundle, not inline `text/html`).

If asked for any of these, tell the user it's unsupported and stop — don't reach for an unrelated tool to approximate it.

## Auth

The connector uses a single Google **OAuth 2.0** access token (auto-refreshed), resolved into the one `google-docs` connection slot. The same credential authorizes both the Docs and Drive hosts; the granted **scopes** decide capability. Pass auth as one connection string with `--connection [<resolver>:]<value>` (CLI / MCP) or `{ connection: "[<resolver>:]<value>" }` (imported). Two resolvers:

- **`env:<ENV_VAR>`** — direct mode. Read the OAuth access token from the named environment variable (conventionally `env:GOOGLE_DOCS_ACCESS_TOKEN`, with the token exported in `GOOGLE_DOCS_ACCESS_TOKEN`; the token stays in `env`, never on argv).
- **`zapier:<connection-id>`** — Zapier-managed auth. Route through a Zapier Google Docs connection; the Zapier auth / retries / governance layer injects the token for you. **Prerequisite: a Zapier account** (free signup at <https://zapier.com>). Find the ID with the Zapier SDK CLI: `npx @zapier/zapier-sdk-cli list-connections GoogleDocsCLIAPI`.

**Scopes are load-bearing.** The full catalog needs `https://www.googleapis.com/auth/documents` (read/write document content) **plus** `https://www.googleapis.com/auth/drive` (the find / export / copy-template / folder operations act on arbitrary existing documents, which the narrower `drive.file` scope cannot reach). A read-only connection can use `documents.readonly` + `drive.readonly` (covers `getDocument` / `findDocuments` / `exportDocument`, no writes). A `403 insufficient authentication scopes` means reconnect with edit access; a `403 caller does not have permission` means you have view-only access to that specific document (a sharing problem, not a reconnect).

If no connection is passed the script fails with an actionable error telling you to `Pass --connection [<resolver>:]<value>` and lists the resolvers in match order.

## Using this skill

### 0. Setup and auth

This connector runs on **Node.js 22.18+** and needs a one-time `npm install` in this directory. `cli.js` self-checks readiness: if dependencies aren't installed it prints `CONNECTOR_SETUP: NEEDS_ACTION` with the exact install command to run. Discover any script's inputs and connections with `--help`:

```bash
node cli.js run <tool-name> --help
```

The `--help` output reports the script's JSON-Schema input contract and the connection flag(s) it reads. See [Auth](#auth) for how to obtain each credential.

### 1. Execute scripts directly

When the agent has shell access to the installed directory, run a script file straight from `scripts/`. Each script is `chmod +x` with a Node-targeted shebang. **Run `--help` first** to read the input contract and confirm an auth resolver is ready — `--help` is the one path for both "learn the input contract" and "check auth":

```bash
# Inspect the contract + resolvers first
./scripts/getDocument.ts --help

# Then invoke (direct token — token stays in env)
GOOGLE_DOCS_ACCESS_TOKEN=ya29.xxx ./scripts/getDocument.ts '{"documentId":"1AbC..."}' --connection env:GOOGLE_DOCS_ACCESS_TOKEN

# Or route through a Zapier connection
./scripts/findDocuments.ts '{"name":"Q4 plan"}' --connection zapier:conn_xxx
```

Prerequisites: Node.js 22.18+ on `PATH`, plus `npm install` once in this directory.

### 2. Use the package's CLI

```bash
GOOGLE_DOCS_ACCESS_TOKEN=ya29.xxx npx @zapier/google-docs-connector run getDocument '{"documentId":"1AbC..."}' --connection env:GOOGLE_DOCS_ACCESS_TOKEN
npx @zapier/google-docs-connector --help                       # all scripts
npx @zapier/google-docs-connector run getDocument --help       # per-script schema + resolvers
```

Same scripts, different entry point. Some harnesses block `npx` — fall back to (1).

### 3. Use as a recipe

When no shipped script matches, read this `SKILL.md`, the [`references/`](references/) files, and the `scripts/` files as a recipe to generate custom code. Each script is one `export default defineTool({...})` from `@zapier/connectors-sdk` referencing the connection key `"google-docs"`; imitate that shape (Zod input/output schemas, `(input, ctx) => …` run body, the direct-mode auth being a Bearer token in the `Authorization` header). If you persist generated code, add a comment pointing back to this skill's source:

```ts
// Source: https://github.com/zapier/connectors/blob/main/apps/google-docs/SKILL.md
```

## API quirks worth knowing

| Reference                                                                        | When to load                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`references/google-docs-api-gotchas.md`](references/google-docs-api-gotchas.md) | Before any index-based edit (insert/format/delete), find-and-replace, image insert, document export, or folder placement — covers UTF-16 indexes, the index-0 section break, stale indexes after edits, the undeletable final newline, `includeTabsContent`, per-tab targeting defaults, Drive-backed find/export/foldering, image fetch + size limits, and PT/RGB units.                                                                                                                 |
| [`references/google-docs-batchupdate.md`](references/google-docs-batchupdate.md) | Before authoring structure — lists (`createList`/`removeListFormatting`), tables (`insertTable`/`modifyTable`), headers/footers/footnotes (`createHeader`/`createFooter`/`createFootnote`), or the `markdown: true` write path — covers the descending-order rule, the seeded-table two-phase fill, list nesting via leading tabs, the second segment-index space (empty header/footer end index 1 → text-at-creation), delete-last-row-deletes-table, and the supported Markdown subset. |
