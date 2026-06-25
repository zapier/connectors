# Google Docs API — gotchas

Behavioral quirks of the Google Docs API v1 (`docs.googleapis.com`) and the
Google Drive API v3 (`www.googleapis.com`) that this connector sits on top of.
Every claim here is sourced to public Google documentation (linked inline).

## Indexes are zero-based UTF-16 offsets

Positions in a document are zero-based indexes counted in **UTF-16 code units**,
relative to the start of the enclosing segment — so a character outside the BMP
(e.g. an emoji, a surrogate pair) consumes **two** index positions. A range is
`{startIndex, endIndex}`, conventionally a half-open interval (`endIndex` is the
position just past the last included unit).

> "Indexes are measured in UTF-16 code units. This means surrogate pairs consume
> two indexes. … Most elements within the body content have the zero-based
> `startIndex` and `endIndex` properties. These indicate the offset of an
> element's beginning and end, relative to the beginning of its enclosing
> segment."
> — [Docs API · Document structure](https://developers.google.com/workspace/docs/api/concepts/structure)

## The body starts with a section break — you cannot insert at index 0

The first structural element of a body is always a **section break occupying
index 0** (it spans `startIndex 0 → endIndex 1`), as shown in Google's own
sample output. Text must be inserted **inside an existing paragraph**, so an
insert (`insertText`, `insertImage`) targets index **≥ 1**.

> The official "Output document contents as JSON" sample shows the body's first
> `content` element is a `sectionBreak` with `"endIndex": 1`.
> — [Docs API · Output as JSON sample](https://developers.google.com/workspace/docs/api/samples/output-json)
>
> "Text must be inserted inside the bounds of an existing `Paragraph`. For
> instance, text cannot be inserted at a table's start index (i.e. between the
> table and its preceding paragraph)."
> — [Docs API · `InsertTextRequest`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/request)

## Indexes shift after every edit — re-read before reusing them

Inserting or deleting text moves every following index. Indexes captured from a
`getDocument` / `findText` before an edit are stale afterward; re-read before the
next index-based call. (The `revisionId` on the document changes when the
document is edited, and can be used to detect that.)

> "Each insertion increments all the higher-numbered indexes by the size of the
> inserted text. … As with insertions, deleting text alters the indexes of all
> the text that follows in the segment."
> — [Docs API · Insert, delete, and move text](https://developers.google.com/workspace/docs/api/how-tos/move-text)
>
> "The revision ID of the document. … If the revision ID is unchanged between
> calls, then the document has not changed. Conversely, a changed ID … usually
> means the document has been updated."
> — [Docs API · `Document.revisionId`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents)

## You cannot delete the final newline of a segment

`deleteContentRange` must not include the implicit trailing newline of the body
(or a header/footer/footnote/table cell/table-of-contents). Doing so produces an
invalid document structure and a 400.

> "Attempting to delete certain ranges can result in an invalid document
> structure in which case a 400 bad request error is returned." Invalid
> deletions include "Deleting the last newline character of a `Body`, `Header`,
> `Footer`, `Footnote`, `TableCell` or `TableOfContents`."
> — [Docs API · `DeleteContentRangeRequest`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/request)

## batchUpdate is atomic; style requests need a `fields` mask

All edits go through `documents.batchUpdate`. Requests are validated and applied
**all-or-nothing**, in order. Style requests (`updateTextStyle`,
`updateDocumentStyle`) require a `fields` mask naming every property to change;
at least one field must be specified, and properties not named are left
untouched. (This connector builds the mask for you.)

> "Each `request` is validated before being applied. If any request is not
> valid, then the entire request will fail and nothing will be applied. … the
> updates in your request are guaranteed to be applied together atomically."
> — [Docs API · `documents.batchUpdate`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/batchUpdate)
>
> "The fields that should be updated. At least one field must be specified. …
> To reset a property to its default value, include its field name in the field
> mask but leave the field itself unset."
> — [Docs API · `UpdateTextStyleRequest`/`UpdateDocumentStyleRequest`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/request)

## Creating a document only honors the title

`documents.create` uses **only the title** — any body content in the create
request is ignored. Initial text must be added with a follow-up `batchUpdate`
(this connector does that for you when you pass `text`).

> "Creates a blank document using the title given in the request. Other fields
> in the request, including any provided content, are ignored."
> — [Docs API · `documents.create`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/create)

## Reading a document: full tree, no paging, opt in to tabs

`documents.get` returns the whole document as one nested `Document` resource —
there is no page size, page token, or server-side index-range parameter (its
only query parameters are `suggestionsViewMode` and `includeTabsContent`). For a
document with tabs you **must** set `includeTabsContent=true` or you get the
**first tab only**.

> "If `includeTabsContent` is set to true, the `documents.get` method will
> return a Document Resource with the `document.tabs` field populated. … If
> `includeTabsContent` is not provided, then the text fields in the Document
> Resource (e.g. `document.body`) will be populated with content from the first
> tab only."
> — [Docs API · Work with tabs](https://developers.google.com/workspace/docs/api/how-tos/tabs)

A `fields` read mask **cannot mix the legacy flat document fields with the tabs
model**: once tabs exist, the legacy top-level fields (`body`, `inlineObjects`,
`lists`, `headers`, `footers`, …) no longer represent the content of all tabs,
so the content fields must be requested through `tabs/documentTab/…` instead of
their flat equivalents. The connector therefore masks the tabs model exclusively
(`tabs/documentTab/…`) and does not request the flat fields alongside it.

> "With the additional structural hierarchy of tabs, legacy fields no longer
> semantically represent the text content from all tabs in the document. … The
> actual document content within the tab is exposed as `tab.documentTab`. … For
> example, instead of using `document.body`, you should use
> `document.tabs[indexOfTab].documentTab.body`."
> — [Docs API · Work with tabs](https://developers.google.com/workspace/docs/api/how-tos/tabs)
> · [Use field masks](https://developers.google.com/workspace/docs/api/how-tos/field-masks)

`suggestionsViewMode` accepts `DEFAULT_FOR_CURRENT_ACCESS` (the default — shows
suggestions inline per the caller's access), `SUGGESTIONS_INLINE`,
`PREVIEW_SUGGESTIONS_ACCEPTED`, and `PREVIEW_WITHOUT_SUGGESTIONS`.

> "Omitting the `SuggestionsViewMode` parameter is equivalent to providing
> `DEFAULT_FOR_CURRENT_ACCESS`."
> — [Docs API · Work with suggestions](https://developers.google.com/workspace/docs/api/how-tos/suggestions)

Embedded images are returned in an `inlineObjects` map, **keyed by object id** —
that key is the `imageObjectId` you pass to `replaceImage`. In the tabs model the
map lives **per tab** under `tab.documentTab.inlineObjects` (not the legacy
top-level `document.inlineObjects`), so it is masked via `tabs/documentTab/inlineObjects`
and aggregated across tabs.

> "`inlineObjects`: … The inline objects in the document, keyed by object ID."
> — [Docs API · `Document`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents)
> · [Work with tabs](https://developers.google.com/workspace/docs/api/how-tos/tabs)

## Tab targeting differs between positional and find-and-replace tools

A `Location` (used by `insertText`/`formatText`/positional edits) applies to the
**first tab** when its `tabId` is omitted. But `replaceAllText` is the opposite:
omit its tab criteria and it replaces across **all tabs**.

> "`tabId` … The tab that the location is in. When omitted, the request is
> applied to the first tab."
> — [Docs API · `Location`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/request)
>
> "`tabsCriteria` … When omitted, the replacement applies to all tabs."
> — [Docs API · `ReplaceAllTextRequest`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/request)

## Find-and-replace: case flag, occurrence count, empty = delete

`replaceAllText` matches via `SubstringMatchCriteria` (`text` + `matchCase`) and
returns `occurrencesChanged`. A result of **0 means nothing matched** (a typo,
casing, or whitespace mismatch) — treat it as a no-op warning, not a success.
The `replaceText` field is a plain string, so passing an empty string removes the
matched text.

> "`matchCase` … True: the search is case sensitive. False: the search is case
> insensitive." / "`occurrencesChanged`: The number of occurrences changed by
> replacing all text."
> — [Docs API · `SubstringMatchCriteria`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/request)
> · [`ReplaceAllTextResponse`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/response)

## Finding, foldering, and exporting go through the Drive API

The Docs API has no list/search method (only `create`, `get`, `batchUpdate`), so
finding documents uses the Drive API `files.list` with a `q` query — filter by
`mimeType = 'application/vnd.google-apps.document'`, `name contains '…'`,
`'<folderId>' in parents`, and `trashed = false`.

> "To search for a specific set of files or folders, use the query string `q`
> field with the `list` method."
> — [Drive API · Search for files](https://developers.google.com/workspace/drive/api/guides/search-files)
> · [MIME types](https://developers.google.com/workspace/drive/api/guides/mime-types)

The Docs `create` call can't set a parent folder, so a doc created that way lands
in the user's **My Drive root**. To place it in a folder, create it via Drive
`files.create` with `parents` set (this connector does that when you pass
`folder`).

> "`parents` … If not specified as part of a create request, the file is placed
> directly in the user's My Drive folder."
> — [Drive API · `File`](https://developers.google.com/workspace/drive/api/reference/rest/v3/files)

Export uses Drive `files.export`. For a Google Doc, **`text/plain` and
`text/markdown`** return usable text. HTML is offered only as **`application/zip`**
(a zipped "Web Page" bundle), **not** `text/html` — so this connector does not
expose an HTML export (use `markdown`).

> Google Docs export rows: "Plain Text" → `text/plain`; "Markdown" →
> `text/markdown`; "Web Page (HTML)" → `application/zip`.
> — [Drive API · Export MIME types](https://developers.google.com/workspace/drive/api/guides/ref-export-formats)

Drive results carry `webViewLink` (browser link) and `modifiedTime`/
`createdTime` as RFC 3339 timestamps; paging is `pageSize` + `nextPageToken`.

> "`webViewLink`: A link for opening the file … in a browser." / "`modifiedTime`
> … (RFC 3339 date-time)."
> — [Drive API · `File`](https://developers.google.com/workspace/drive/api/reference/rest/v3/files)

## Images are fetched by Google from a public URL

`insertImage`/`replaceImage` take an image **URI**; Google fetches it
**server-side at insertion time**, so it must be publicly reachable (no auth).
The image must be **PNG, JPEG, or GIF**, **under 50MB**, **at most 25
megapixels**, and the **URI at most 2kB**. `replaceImage` scales and centers the
new image to the original image's bounds (cropping if needed).

> "The image is fetched once at insertion time … The provided URI must be
> publicly accessible and at most 2 kB in length. … Images must be less than
> 50MB in size, cannot exceed 25 megapixels, and must be in one of PNG, JPEG, or
> GIF format."
> — [Docs API · `InsertInlineImageRequest`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/request)
>
> "`CENTER_CROP`: Scales and centers the image to fill the bounds of the
> original image. The image may be cropped …"
> — [Docs API · `ReplaceImageRequest`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/request)

## Colors are 0–1 floats; dimensions are points

Document colors are `RgbColor` with `red`/`green`/`blue` as floats **0.0–1.0**
(not 0–255); this connector accepts `#RRGGBB` and converts. Sizes (font size,
page size, margins) are a `Dimension {magnitude, unit}` where **`PT` = a point =
1/72 inch** — so US Letter (8.5×11 in) is 612×792 pt and a 1-inch margin is 72.

> "`red`: The red component of the color, from 0.0 to 1.0." / "`PT`: A point,
> 1/72 of an inch."
> — [Docs API · `RgbColor`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents#RgbColor)
> · [`Dimension`](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents#Dimension)
