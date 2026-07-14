# Using Google Docs from a code-execution sandbox

This is the write-your-own-code shape: you're a harness that can only produce and run a
snippet of code — no pre-registered tools, no terminal/subprocess access, and no ability
to `import` this package as a dependency. This reference teaches you enough about the
Google Docs API surface this connector wraps to write equivalent HTTP calls yourself.

It does not replace [`google-docs-api-gotchas.md`](google-docs-api-gotchas.md) or
[`google-docs-batchupdate.md`](google-docs-batchupdate.md) — it points into both for every
claim about how the vendor API actually behaves. Read this file for the request/response
_shapes_; read those two for the _rules_.

## Auth and base URLs

Two hosts, one credential:

- `https://docs.googleapis.com/v1` — document content and the `batchUpdate` write endpoint.
- `https://www.googleapis.com/drive/v3` — find, export, template-copy, and folder placement
  (operations the Docs API itself doesn't expose).

Every request needs a valid OAuth 2.0 access token in an `Authorization: Bearer <token>`
header. Obtaining and refreshing that token (client id/secret, consent, refresh flow) is
outside this reference's scope — write your own OAuth client, or otherwise arrange to hold
a token with the right scopes before you start. Which of the operations below your token
can actually perform depends on what scopes it was granted; the two ways that shows up on
the wire are covered under **Error-handling pattern** below.

## The batchUpdate mechanism

Nearly every _write_ in this API — text, formatting, lists, tables, images, headers,
footers, footnotes, page style — goes through exactly one RPC:

```
POST {docsBase}/documents/{documentId}:batchUpdate
Content-Type: application/json

{ "requests": [ <Request>, <Request>, ... ] }
```

- **`requests` is an array of tagged-union objects.** Each element has exactly one key
  naming the request type (e.g. `insertText`, `updateTextStyle`, `replaceAllText`,
  `insertTable`), whose value is that request's own parameters. You build one such object
  per edit you want applied.
- **An empty `requests` array is invalid** — send at least one.
- **The response is `{ "replies": [ <Reply>, ... ] }`** — one entry per request, _in the
  same order you sent them_. Most request types reply with `{}` (nothing to report); a few
  echo a result you need for a follow-up call — e.g. `replaceAllText` replies with
  `{ replaceAllText: { occurrencesChanged } }`, `insertInlineImage` with
  `{ insertInlineImage: { objectId } }`, `createHeader`/`createFooter`/`createFootnote` with
  `{ create___: { ___Id } }`. Read the reply at the same array index as the request that
  produced it.
- **This connector's tools each build exactly one `batchUpdate` call carrying (usually)
  exactly one request** — the multi-request exception is the seeded-table and nested-list
  cases described in the per-family notes below, where a single tool call legitimately
  needs several requests applied together.

For _how Google actually processes that array_ — ordering rules, what's atomic, the
`fields`-mask requirement on style requests, and everywhere index math can go wrong — see
[`google-docs-batchupdate.md`](google-docs-batchupdate.md) (authoring-specific quirks) and
[`google-docs-api-gotchas.md`](google-docs-api-gotchas.md) (index fundamentals shared by
every write). Do not assume anything about ordering or atomicity beyond what those files
say — this section only describes the shape of the call, not its semantics.

## Request/response shape patterns per operation family

These shapes are structural — field names and types, derived directly from this
connector's own request-building code. Where a field takes a fixed literal (like a unit
string) it's shown because the connector's code always sends that literal, not as a claim
about what the vendor API accepts more broadly. No limits, enum catalogs, or ids below are
vendor facts — those live in the two gotchas files, linked where relevant.

### Document lifecycle

| Operation                 | Input shape                                                                                     | Output shape                                                                                                                                                                                                                                                                    | How it's built                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create                    | `{ title: string, text?: string, markdown?: boolean, folder?: string }`                         | `{ documentId, title, revisionId?, url }`                                                                                                                                                                                                                                       | No `folder` → `POST /documents` with `{ title }`. With `folder` → Drive `POST /files` with `{ name, mimeType, parents: [folder] }` instead (the Docs create endpoint can't set a parent). If `text` is given, a follow-up `batchUpdate` inserts it — one `insertText` request for plain text, or the Markdown-rendered request set (see below) when `markdown` is true. |
| Create from template      | `{ templateId: string, title: string, replacements?: Record<string, string>, folder?: string }` | `{ documentId, title, url, replacementsApplied: { placeholder, occurrencesChanged }[] }`                                                                                                                                                                                        | Drive `POST /files/{templateId}/copy` with `{ name, parents? }`, then one `batchUpdate` with one `replaceAllText` request per `replacements` entry (`containsText: { text: key, matchCase: true }, replaceText: value`), skipped entirely if `replacements` is empty.                                                                                                   |
| Get (structure + indices) | `{ documentId: string, startIndex?: number, endIndex?: number, suggestionsViewMode?: string }`  | `{ documentId, title, revisionId?, tabs: { tabId, title, index }[], content: { startIndex, endIndex, tabId, type, text, table?: { rows, columns } }[], inlineObjects: Record<string, unknown>, segments: { headerIds: string[], footerIds: string[], footnoteIds: string[] } }` | `GET /documents/{documentId}?includeTabsContent=true&fields=<fixed mask>`, then the deep tree is flattened client-side into `content[]`; `startIndex`/`endIndex` (if given) filter that flattened list by range overlap — the API call itself always fetches the whole document.                                                                                        |
| Export (plain read)       | `{ documentId: string, format?: "text" \| "markdown" }`                                         | `{ documentId, format, content: string }`                                                                                                                                                                                                                                       | Drive `GET /files/{documentId}/export?mimeType=<mapped from format>`; body read as text and returned verbatim.                                                                                                                                                                                                                                                          |
| Find                      | `{ name?: string, folder?: string, limit?: number, pageToken?: string }`                        | `{ documents: { documentId, title, url, modifiedTime, createdTime }[], nextPageToken? }`                                                                                                                                                                                        | Drive `GET /files?q=<clauses joined by " and ">&pageSize=<limit>&fields=<fixed mask>`; each optional input adds one clause to `q`.                                                                                                                                                                                                                                      |

### Content edits (positional / find-and-replace)

| Operation                   | Input shape                                                                                | Output shape                                                       | How it's built                                                                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Append                      | `{ documentId, text: string, markdown?: boolean, tabId?: string }`                         | `{ documentId, success: true }`                                    | Plain: one `insertText` request with `endOfSegmentLocation` (no index math). Markdown: first a `GET` to find the target segment's current end index, then the Markdown-rendered request set anchored there. |
| Insert at index             | `{ documentId, text: string, index: number, tabId?: string, segmentId?: string }`          | `{ documentId, success: true }`                                    | One `insertText` request with `location: { index, tabId?, segmentId? }`. The tool itself rejects `index < 1` before making any request.                                                                     |
| Replace all                 | `{ documentId, find: string, replace: string, matchCase?: boolean, tabId?: string }`       | `{ documentId, occurrencesChanged: number }`                       | One `replaceAllText` request: `{ containsText: { text: find, matchCase }, replaceText: replace, tabsCriteria?: { tabIds: [tabId] } }`. `occurrencesChanged` is read back from that request's reply.         |
| Delete range                | `{ documentId, startIndex: number, endIndex: number, tabId?: string, segmentId?: string }` | `{ documentId, success: true }`                                    | One `deleteContentRange` request with `range: { startIndex, endIndex, tabId?, segmentId? }`.                                                                                                                |
| Find text (locate, no edit) | `{ documentId, query: string, matchCase?: boolean }`                                       | `{ documentId, matches: { text, startIndex, endIndex, tabId }[] }` | No dedicated search endpoint exists — this is a `GET` of the document (content-only fields mask) followed by a client-side substring walk over every tab and every table cell.                              |

### Formatting

| Operation              | Input shape                                                                                                                                                                                                        | Output shape                    | How it's built                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Character formatting   | `{ documentId, startIndex, endIndex, bold?, italic?, underline?, strikethrough?: boolean, fontSize?: number, fontFamily?: string, foregroundColor?, backgroundColor?: string, link?: string, tabId?, segmentId? }` | `{ documentId, success: true }` | One `updateTextStyle` request. Only the fields you set are added to the `textStyle` object _and_ named in a comma-joined `fields` mask string — this is the field-mask mechanism `google-docs-api-gotchas.md` describes; see the rule linked below for what an unmasked field means. Colors are converted from `#RRGGBB` to the API's color object; `fontSize` becomes `{ magnitude, unit: "PT" }`.                                                                           |
| Paragraph formatting   | `{ documentId, startIndex, endIndex, namedStyle?, alignment?, lineSpacing?, spaceAbove?, spaceBelow?, indentStart?, indentFirstLine?, tabId? }`                                                                    | `{ documentId, success: true }` | Same set-fields-and-mask pattern as character formatting, one `updateParagraphStyle` request.                                                                                                                                                                                                                                                                                                                                                                                 |
| Create/convert list    | `{ documentId, startIndex, endIndex, style?: "bullet" \| "numbered", levels?: number[], tabId? }`                                                                                                                  | `{ documentId, success: true }` | No nesting (`levels` omitted or all zero): one `createParagraphBullets` request — the same request both applies a fresh list and converts an existing one's style. With nesting: first a `GET` to enumerate the paragraphs in range, then one `batchUpdate` carrying a leading-tab `insertText` request per paragraph that needs nesting (built **descending by index**, highest index first) plus one trailing `createParagraphBullets` request over the tab-expanded range. |
| Remove list formatting | `{ documentId, startIndex, endIndex, tabId? }`                                                                                                                                                                     | `{ documentId, success: true }` | One `deleteParagraphBullets` request.                                                                                                                                                                                                                                                                                                                                                                                                                                         |

### Images

| Operation     | Input shape                                                                                     | Output shape                       | How it's built                                                                                                                                                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Insert image  | `{ documentId, imageUrl: string, index?: number, width?, height?: number, tabId?, segmentId? }` | `{ documentId, objectId: string }` | One `insertInlineImage` request: `{ uri: imageUrl, location \| endOfSegmentLocation, objectSize?: { width?, height?: { magnitude, unit: "PT" } } }`. `objectId` is read back from the reply. The URL is validated client-side before the request is ever sent. |
| Replace image | `{ documentId, imageObjectId: string, imageUrl: string, tabId? }`                               | `{ documentId, success: true }`    | One `replaceImage` request: `{ imageObjectId, uri: imageUrl, tabId? }`. Same client-side URL validation as insert.                                                                                                                                             |

### Document style

| Operation             | Input shape                                                                                                               | Output shape                    | How it's built                                                                                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Update document style | `{ documentId, backgroundColor?, pageWidth?, pageHeight?, marginTop?, marginBottom?, marginLeft?, marginRight?: number }` | `{ documentId, success: true }` | One `updateDocumentStyle` request, same set-fields-and-mask pattern — note nested field paths appear in the mask as dotted strings (e.g. `pageSize.width`), and this request has no `tabId` (document style isn't per-tab). Every dimension is sent as `{ magnitude, unit: "PT" }`. |

### Tables

| Operation    | Input shape                                                                                                                                                                                                | Output shape                                             | How it's built                                                                                                                                                                                                                                                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Insert table | `{ documentId, rows: number, columns: number, index?: number, cells?: string[][], tabId? }`                                                                                                                | `{ documentId, success: true, tableStartIndex: number }` | Three phases: **(1)** one `insertTable` request (`location` or `endOfSegmentLocation`) creates the empty grid; **(2)** a `GET` re-reads the document to locate the new table and each cell's own `startIndex`; **(3)**, only if `cells` was given, one `batchUpdate` of per-cell `insertText` requests built **descending by cell startIndex**. |
| Modify table | `{ documentId, tableStartIndex: number, op: "insertRow" \| "insertColumn" \| "deleteRow" \| "deleteColumn", rowIndex: number, columnIndex: number, insertBelow?: boolean, insertRight?: boolean, tabId? }` | `{ documentId, success: true }`                          | Builds a `TableCellLocation`: `{ tableStartLocation: { index: tableStartIndex, tabId? }, rowIndex, columnIndex }`, then one request from `insertTableRow` / `insertTableColumn` / `deleteTableRow` / `deleteTableColumn` depending on `op`.                                                                                                     |

### Headers, footers, footnotes

| Operation       | Input shape                              | Output shape                        | How it's built                                                                                                                                                                                                                                                         |
| --------------- | ---------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create header   | `{ documentId, text?: string }`          | `{ documentId, segmentId: string }` | One `createHeader` request (`{ type: "DEFAULT" }`); `segmentId` is the `headerId` read back from the reply. If `text` is given, a _second_ `batchUpdate` call inserts it via `insertText` with `endOfSegmentLocation: { segmentId }`.                                  |
| Create footer   | `{ documentId, text?: string }`          | `{ documentId, segmentId: string }` | Same two-call pattern as header, with `createFooter` / `footerId`.                                                                                                                                                                                                     |
| Create footnote | `{ documentId, index?: number, tabId? }` | `{ documentId, segmentId: string }` | One `createFootnote` request (`location` or `endOfSegmentLocation`); `segmentId` is the `footnoteId` read back from the reply. The footnote's own text is written afterward with a separate insert-text call targeting that `segmentId` — it is not part of this call. |

Every `success: true` shape above is the same minimal envelope: a non-throwing call means
the whole `batchUpdate` for that operation landed. There is no partial-success shape to
handle — see the mechanism note in the next section.

## Error-handling pattern

Every call in this connector wraps the raw HTTP response the same way:

- **On a 2xx response**, the body is parsed and returned as that operation's own shape (the
  tables above).
- **On any non-2xx response**, nothing is returned — the call throws an `Error` instead of
  producing a `{ data: null, error }`-shaped result. If you're writing your own version of
  this, plan for exceptions/rejections as the error channel, not a sentinel value in the
  response body.
- **The thrown message is shaped `Google Docs <operation> <status>: <detail>`**, where
  `<detail>` is either Google's own error message or a more specific, actionable rewrite for
  a handful of recognized cases. The recognized cases (matched by HTTP status plus a
  substring of Google's message) are:
  - `403` containing "insufficient authentication scopes" → a missing-scope condition (the
    connection needs re-authorizing with edit access).
  - `403` containing "caller does not have permission" → a sharing/permission condition on
    that specific document (view-only access), distinct from the scope case above.
  - an export-size-limit condition on `exportDocument`.
  - an image-fetch-forbidden condition and a separate image-unretrievable condition on
    `insertImage` / `replaceImage`.
  - `404` → treated as "document not found."
  - `429` (or a resource-exhausted status) → treated as a rate-limit condition.
  - anything else → the raw status and Google's own message, unrewritten.

Because a batchUpdate is all-or-nothing (see
[`google-docs-api-gotchas.md`](google-docs-api-gotchas.md#batchupdate-is-atomic-style-requests-need-a-fields-mask)),
a thrown error from a batchUpdate call means **none** of that call's requests were applied
— there is no partial-write state to reconcile before retrying.

## Critical rules (pointers only)

Everything below is a fact about how the _vendor API_ behaves, not about this connector's
code — each one is sourced and explained in full in one of the two existing reference
docs. Load the relevant one before you rely on the behavior; this list only tells you which
rule lives where.

From [`google-docs-api-gotchas.md`](google-docs-api-gotchas.md):

- [Indexes are zero-based UTF-16 offsets](google-docs-api-gotchas.md#indexes-are-zero-based-utf-16-offsets)
- [The body starts with a section break — you cannot insert at index 0](google-docs-api-gotchas.md#the-body-starts-with-a-section-break--you-cannot-insert-at-index-0)
- [Indexes shift after every edit — re-read before reusing them](google-docs-api-gotchas.md#indexes-shift-after-every-edit--re-read-before-reusing-them)
- [You cannot delete the final newline of a segment](google-docs-api-gotchas.md#you-cannot-delete-the-final-newline-of-a-segment)
- [batchUpdate is atomic; style requests need a `fields` mask](google-docs-api-gotchas.md#batchupdate-is-atomic-style-requests-need-a-fields-mask)
- [Creating a document only honors the title](google-docs-api-gotchas.md#creating-a-document-only-honors-the-title)
- [Reading a document: full tree, no paging, opt in to tabs](google-docs-api-gotchas.md#reading-a-document-full-tree-no-paging-opt-in-to-tabs)
- [Tab targeting differs between positional and find-and-replace tools](google-docs-api-gotchas.md#tab-targeting-differs-between-positional-and-find-and-replace-tools)
- [Find-and-replace: case flag, occurrence count, empty = delete](google-docs-api-gotchas.md#find-and-replace-case-flag-occurrence-count-empty--delete)
- [Finding, foldering, and exporting go through the Drive API](google-docs-api-gotchas.md#finding-foldering-and-exporting-go-through-the-drive-api)
- [Images are fetched by Google from a public URL](google-docs-api-gotchas.md#images-are-fetched-by-google-from-a-public-url)
- [Colors are 0–1 floats; dimensions are points](google-docs-api-gotchas.md#colors-are-01-floats-dimensions-are-points)

From [`google-docs-batchupdate.md`](google-docs-batchupdate.md):

- [One Request per call; order index-dependent edits descending](google-docs-batchupdate.md#one-request-per-call-order-index-dependent-edits-descending)
- [Seeded tables are the two-phase exception](google-docs-batchupdate.md#seeded-tables-are-the-two-phase-exception)
- [Lists: one request applies _or_ converts; nesting is the index-mutating part](google-docs-batchupdate.md#lists-one-request-applies-or-converts-nesting-is-the-index-mutating-part)
- [modifyTable addresses a cell by table + row + column](google-docs-batchupdate.md#modifytable-addresses-a-cell-by-table--row--column)
- [Headers, footers, and footnotes are a second index space](google-docs-batchupdate.md#headers-footers-and-footnotes-are-a-second-index-space)
- [Markdown rendering is a create/append-only convenience](google-docs-batchupdate.md#markdown-rendering-is-a-createappend-only-convenience)

## Where to go next

- [`google-docs-api-gotchas.md`](google-docs-api-gotchas.md) — index fundamentals, tabs,
  Drive-backed find/export/folder placement, image constraints, and unit conversions. Load
  this before writing any index-based edit, a find-and-replace, an image insert, an export,
  or a folder placement.
- [`google-docs-batchupdate.md`](google-docs-batchupdate.md) — the descending-order rule,
  the seeded-table two-phase fill, list nesting via leading tabs, the header/footer/footnote
  segment-index model, delete-last-row-deletes-table, and the supported Markdown subset.
  Load this before authoring lists, tables, headers/footers/footnotes, or using the
  Markdown write path.
- [`../SKILL.md#auth`](../SKILL.md#auth) — the connection/scope model in the connector's own
  words (this file only covers the wire-level Bearer token requirement).
- [`../SKILL.md#output-format`](../SKILL.md#output-format) and
  [`../SKILL.md#disambiguation--refusals`](../SKILL.md#disambiguation--refusals) — the
  `{ data, meta }` envelope convention and the disambiguation-before-write / unsupported-operation
  rules this connector's tools follow, which are worth replicating in your own code even
  though you're calling the vendor API directly.
