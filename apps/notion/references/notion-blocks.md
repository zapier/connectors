# Notion blocks

Block content format, used by `appendBlockChildren`, `createPage` (the `children` array), `updateBlock`, `getBlock`, and `getBlockChildren`.

## A block is a typed object

A block represents one unit of page content (a paragraph, heading, list item, to-do, etc.). It has a `type` field plus a key with the **same name as the type** carrying its content. From the [block reference](https://developers.notion.com/reference/block):

```json
{
  "object": "block",
  "id": "...",
  "type": "paragraph",
  "paragraph": {
    /* type-specific content */
  }
}
```

So to build a paragraph you send `{ "type": "paragraph", "paragraph": { "rich_text": [ ... ] } }`. The type key must match the `type` value.

## Common block types

Per the [block reference](https://developers.notion.com/reference/block), frequently-used types include:

`paragraph`, `heading_1`, `heading_2`, `heading_3`, `bulleted_list_item`, `numbered_list_item`, `to_do`, `callout`, `quote`, `code`, `divider`, `table` / `table_row`, `image`, `video`, `file`, `pdf`, `embed`, `bookmark`.

Most text-bearing types (paragraph, headings, list items, to-do, quote, callout) carry a `rich_text` array. `to_do` also carries a `checked` boolean.

## Block fields

From the [block reference](https://developers.notion.com/reference/block):

- `has_children` — "Boolean indicating whether or not the block has children blocks nested within it." If true, fetch the nested content with `getBlockChildren`.
- `in_trash` — "Boolean field to check if a block is in the trash (replaces deprecated `archived`)."
- `created_time` / `last_edited_time` — ISO 8601 timestamps.

## Rich text

A `rich_text` value is an **array** of styled text fragments. The common case is a text fragment. From the [rich text reference](https://developers.notion.com/reference/rich-text):

```json
{
  "type": "text",
  "text": { "content": "...", "link": null },
  "annotations": {
    "bold": false,
    "italic": false,
    "strikethrough": false,
    "underline": false,
    "code": false,
    "color": "default"
  },
  "plain_text": "...",
  "href": null
}
```

When writing content you usually only need `{ "type": "text", "text": { "content": "..." } }` — Notion fills in `plain_text` and default `annotations`. Set `text.link` to `{ "url": "..." }` for a hyperlink. To style, set the relevant `annotations` flags. Keep `text.content` within the 2000-character limit (see [notion-api-gotchas.md](notion-api-gotchas.md)).

## Appending children

`appendBlockChildren` takes a `children` array of block objects. From the [append block children reference](https://developers.notion.com/reference/patch-block-children):

- "Creates and appends new children blocks to the parent `block_id` specified."
- "By default, blocks are appended to the end of the parent block's children." (A page id is a valid `block_id` — a page is a block.)
- Limit: "There is a limit of 100 block children that can be appended by a single API request."
- Nesting: "For blocks that allow children, we allow up to two levels of nesting in a single request." Nest by putting a `children` array inside a block object.

To insert at a specific point rather than the end, pass an existing child id; the connector exposes this as the `after` field.

## Updating a block

`updateBlock` "[Updates the content for the specified `block_id` based on the block type.](https://developers.notion.com/reference/update-a-block)" You pass a single type-keyed object matching the block's **existing** type (e.g. `{ "paragraph": { "rich_text": [...] } }`) — the update is scoped to that type, so you cannot turn one block type into another by updating it. "[The update replaces the entire value for a given field. If a field is omitted (ex: omitting `checked` when updating a `to_do` block), the value will not be changed.](https://developers.notion.com/reference/update-a-block)" Set `in_trash: true` on the same endpoint to trash the block.
