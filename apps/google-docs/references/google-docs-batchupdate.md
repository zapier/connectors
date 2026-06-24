# Google Docs API — batchUpdate & authoring

How this connector composes `documents.batchUpdate` edits, and the per-Request-type
quirks behind the authoring tools (lists, tables, headers/footers/footnotes) and the
Markdown write path. The shared index fundamentals — zero-based UTF-16 offsets, the
index-0 section break, indexes going stale after every edit, the undeletable final
newline, atomic batches, and the `fields` mask — live in
[`google-docs-api-gotchas.md`](google-docs-api-gotchas.md); load that first for any
content edit. Every claim here is sourced to public Google documentation (linked inline).

## One Request per call; order index-dependent edits descending

Within a single `batchUpdate`, requests apply **sequentially**, so each insert or delete
shifts the indexes of everything after it. Google's rule for a multi-request batch is to
order index-dependent requests **descending by index**, so an earlier request never
invalidates a later request's index. Each connector tool issues **one** Request per call,
so this within-call shift normally never arises — the hazard that remains is **cross-call**:
after any edit, re-read `getDocument` / `findText` before the next index-based call. The
two places the connector itself emits multiple index-dependent requests in one call
(seeded `insertTable`, nested `createList`) generate them descending internally.

> "Each insertion increments all the higher-numbered indexes by the size of the inserted
> text. … As with insertions, deleting text alters the indexes of all the text that
> follows in the segment."
> — [Docs API · Insert, delete, and move text](https://developers.google.com/workspace/docs/api/how-tos/move-text)

## Seeded tables are the two-phase exception

A table's cell indexes don't exist until the table does, so `insertTable` with `cells`
can't be one Request. The connector runs it in phases: **(1)** `InsertTable` to create the
empty grid, **(2)** re-`get` the document to read each cell's `startIndex`, **(3)** emit
the per-cell `InsertText` requests **descending by index** in one batch. This is the only
tool that recomputes indexes inside a single call — an empty `insertTable` (no `cells`) is
a plain one-Request insert. `InsertTable` also inserts a **newline before** the table, so
the table doesn't start at the exact insertion index.

> "A newline character will be inserted before the inserted table."
> — [Docs API · `InsertTableRequest`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/request)

## Lists: one request applies _or_ converts; nesting is the index-mutating part

`createList` emits `CreateParagraphBullets`, which both **creates** a list on plain
paragraphs and **changes the bullet style** of an existing one — so the same tool turns a
range into a list and converts bullets↔numbers. Applying or removing bullets is
index-neutral. The exception is explicit nesting (`levels`): the API derives a paragraph's
nesting level by **counting leading tab characters**, so the connector inserts the right
number of leading tabs per paragraph (descending by index) before bulleting. `removeListFormatting`
(`DeleteParagraphBullets`) strips bullets but **adds indentation** to preserve the visual
nesting — so removing-then-re-adding is not a perfect round-trip.

> "You can also use `CreateParagraphBulletsRequest` to change the bullet style for an
> existing list." / "The nesting level of each paragraph is determined by counting leading
> tabs in front of each paragraph." / "To visually preserve the nesting level, indentation
> is added to the start of each corresponding paragraph."
> — [Docs API · Work with lists](https://developers.google.com/workspace/docs/api/how-tos/lists)

## modifyTable addresses a cell by table + row + column

`modifyTable` targets a cell with three scalars — `tableStartIndex` (a table element's
`startIndex` from `getDocument`, or `insertTable`'s `tableStartIndex` output) plus a
zero-based `rowIndex` / `columnIndex` — which the connector resolves to the API's
`TableCellLocation`. `getDocument` surfaces each table element's `rows`/`columns` to bound
the valid indices; it does **not** expose per-cell start indexes (cell text is read via
`exportDocument` / `findText`). Note the destructive edge: deleting the **last** row (or
column) deletes the **whole table**.

> "If no rows remain in the table after this deletion, the whole table is deleted."
> (equivalently for columns)
> — [Docs API · `DeleteTableRowRequest` / `DeleteTableColumnRequest`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/request)

## Headers, footers, and footnotes are a second index space

Indexes are relative to the start of the **enclosing segment**. The body is one segment
(`segmentId: ""`); each header, footer, and footnote is its **own** segment with its own
0-based index space. The core text tools only ever address the body; the positional tools
(`insertText`, `formatText`, `deleteContentRange`, `insertImage`) take an optional
`segmentId` to target a non-body segment, and `createHeader`/`createFooter`/`createFootnote`
return the `segmentId` to thread in.

- **A fresh header/footer segment has end index 1** — only the implicit trailing newline,
  so there is no valid index _inside a paragraph_ to `insertText` at. `createHeader` /
  `createFooter` therefore take the header/footer text as a **`text` input written at
  creation** (via `endOfSegmentLocation`, which appends without an index). Style the result
  afterward by passing the returned `segmentId` to `formatText`. (Footnotes differ — see
  below.)
- **Creating a default header/footer that already exists is a 400.** There is one default
  header and one default footer per document.
- **A footnote reference shifts following body indexes by 1** (the reference mark is a
  character), and the footnote body is written separately via `insertText` targeting the
  returned footnote `segmentId`. Footnote references **cannot** be inserted inside an
  equation, header, footer, or footnote.

> A body's/segment's first structural element terminates at `endIndex` 1 (the implicit
> trailing newline), per the official "Output as JSON" sample and the structure docs; each
> segment has its own index space.
> — [Docs API · Output as JSON sample](https://developers.google.com/workspace/docs/api/samples/output-json) · [Document structure](https://developers.google.com/workspace/docs/api/concepts/structure)
>
> "If a header of the specified type already exists, a 400 bad request error is returned."
> (equivalently for footers) / "Footnote references cannot be inserted inside an equation,
> header, footer or footnote."
> — [Docs API · `CreateHeaderRequest` / `CreateFooterRequest` / `CreateFootnoteRequest`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/request)

## Markdown rendering is a create/append-only convenience

`createDocument` and `appendText` accept a `markdown: true` flag that renders a supported
Markdown subset into one atomic `batchUpdate`. The supported subset maps to real requests:
headings `#`–`######` → `UpdateParagraphStyle` named styles; **bold / italic / underline**
→ `UpdateTextStyle`; **links** → `UpdateTextStyle` `link.url`; **bulleted / numbered lists**
→ `CreateParagraphBullets`. Unsupported Markdown (tables, images, code fences, blockquotes)
is inserted as **literal text** — documented, never silently dropped.

This is offered **only** on create/append because there the connector **owns the indexes of
the content it is inserting** — it inserts the body text, then emits the formatting requests
against its own known offsets (descending, generated internally), with no foreign shifting
index. Rendering Markdown at an arbitrary _existing_ index would anchor formatting to
foreign content whose indexes shift as the batch applies — the harder variant, deliberately
not exposed. To format existing content, use the positional tools (`formatText`,
`formatParagraph`, `createList`) on ranges from `findText` / `getDocument`.
