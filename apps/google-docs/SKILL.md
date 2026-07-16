---
name: google-docs
description: Agent-callable Google Docs tools — create, read, export, and find documents; edit text, formatting, images, and page style. Use when the user mentions Google Docs or wants to create, read, search, or edit document content, even if they don't name Google Docs explicitly.
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
metadata:
  title: Google Docs
  source: https://github.com/zapier/connectors/blob/main/apps/google-docs/SKILL.md
  zapier-app-key: GoogleDocsCLIAPI
  api-docs: https://developers.google.com/workspace/docs/api/reference/rest
---

# Google Docs

_Independent, unofficial connector for Google Docs. Not affiliated with, endorsed by, or sponsored by Google Docs. "Google Docs" is a trademark of its owner, used only to identify the service this connector works with._

Tools for working with Google Docs against the [Google Docs API v1](https://developers.google.com/workspace/docs/api/reference/rest) (`https://docs.googleapis.com/v1/`) for document content, and the [Google Drive API v3](https://developers.google.com/workspace/drive/api/reference/rest/v3/files) (`https://www.googleapis.com/drive/v3/`) for the find / export / copy-template / folder operations the Docs API doesn't provide. 22 tools: create documents (blank, from text/Markdown, or from a template), read a document's structured content and tabs, export it as text/Markdown, find documents by name, and edit content — append / insert / find-and-replace / delete text, locate text positions, apply character and paragraph formatting, make bulleted/numbered lists, insert and edit tables, create headers / footers / footnotes, insert and replace inline images, and set page/margin/background style.

## When to use this

- An agent needs to **create** a document — blank, from initial text or Markdown, or by filling a `{{placeholder}}` template, optionally in a specific Drive folder.
- An agent needs to **read** a document — its structured content + edit indices (`getDocument`), clean text/Markdown (`exportDocument`), or to find documents by name (`findDocuments`) and locate text (`findText`).
- An agent needs to **edit text** — append, insert at a position, find-and-replace, or delete a range.
- An agent needs to **format or restyle** — apply character formatting; make bulleted or numbered lists (`createList`); set paragraph style — headings, alignment, line spacing, indentation (`formatParagraph`); insert/replace inline images; or set page size / margins / background.
- An agent needs to **structure the document** — insert a table and fill its cells (`insertTable`), add/remove table rows or columns (`modifyTable`), create a header or footer with its text (`createHeader` / `createFooter`) and style it by passing the returned `segmentId` to `formatText`, or add a footnote (`createFootnote`) and write its body via `insertText` targeting the returned `segmentId`.

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill google-docs` (or your harness's own skill-install mechanism), then continue here. Installing the skill copies these files, not dependencies. Before running the CLI, a local MCP server, or `zapier-sdk` auth commands, run `npm install --omit=dev` here once. Importing the published package as a dependency in your own project instead? That `npm install` already resolves everything — see [`references/use-as-sdk.md`](references/use-as-sdk.md).

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                                  | Load                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__google-docs__<tool>`), or you can register a local server yourself (or guide the user to)                      | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                                            | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                                   | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| You have... no tool access, no terminal, no ability to import this package — you write your own code that calls the Google Docs API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

## Scripts

All scripts use the single `google-docs` connection (one OAuth credential authorizes both the Docs and Drive hosts).

| Script                                                                           | Script name                  | Connections   | Description                                                                                |
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

## Auth

Every shape passes auth as one connection **selector**, not the secret — a `[<resolver>:]<value>` string. Every connector accepts `zapier:<connection-id>` (Zapier-managed auth — routes through Zapier's auth, retries, and governance layer); some also accept one or more direct-token resolvers (naming and count vary per connector) — check this connector's own resolvers rather than assuming. The `<resolver>:` prefix is optional; a bare value goes to the first resolver that claims it — a UUID-shaped bare value always claims `zapier:`. Each script declares the connections it needs and the resolvers each accepts. The exact syntax for passing a connection (and how to see this connector's resolver list) differs by shape — see the reference you loaded above.

Checking what's already configured first? Don't dump environment values to do it — `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if one is set. Check names only (`env | cut -d= -f1 | grep -i <name>`) or test a known name directly (`[ -n "$VAR_NAME" ]`).

No connection yet? Pick one — and follow the reference's own flow to obtain it; never just ask the user for a connection id or token as if they already have one memorized:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Output format

Every script returns a `{ data, meta }` envelope:

- **`data`** — the script's result (the shape its `outputSchema` declares; see the reference you loaded above for how to inspect a script's exact schema in your shape).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths were stripped from `data`: fields the script returned from the API that the `outputSchema` doesn't declare. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked script output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, opt out of output validation (the exact syntax differs by shape — see the reference you loaded above). Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, pass a jq expression that post-processes `data` (again, exact syntax per shape). The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (run the script's `--help` — or your shape's equivalent — to see its output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema.

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

## References

Load the matching reference file before working in that area:

| Reference                                                                        | Covers                                                                                                                                                                                                                                        | Load it when                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`references/google-docs-api-gotchas.md`](references/google-docs-api-gotchas.md) | UTF-16 indexes, the index-0 section break, stale indexes after edits, the undeletable final newline, `includeTabsContent`, per-tab targeting defaults, Drive-backed find/export/foldering, image fetch + size limits, and PT/RGB units.       | Before any index-based edit (insert/format/delete), find-and-replace, image insert, document export, or folder placement.                                                                                                       |
| [`references/google-docs-batchupdate.md`](references/google-docs-batchupdate.md) | Descending-order rule, the seeded-table two-phase fill, list nesting via leading tabs, the second segment-index space (empty header/footer end index 1 → text-at-creation), delete-last-row-deletes-table, and the supported Markdown subset. | Before authoring structure — lists (`createList`/`removeListFormatting`), tables (`insertTable`/`modifyTable`), headers/footers/footnotes (`createHeader`/`createFooter`/`createFootnote`), or the `markdown: true` write path. |
