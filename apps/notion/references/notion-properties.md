# Notion properties

Data-source property **schemas** and page property **values**. Used by `createDatabase` (the `initial_data_source`), `createDataSource`, `updateDataSource` (schema), and `createPage` / `updatePage` (values).

Two different shapes share the word "properties," and mixing them up is the most common mistake:

- **Schema** (on a data source): defines what columns exist — property _name_ → `{ type, ...config }`.
- **Value** (on a page): the data in a row — property _name_ → a type-specific value object.

Always read the schema first (`getDataSource`) to learn the valid property names and types before writing values.

## Property schema object (data source)

A schema is keyed by property **name**; each value declares the property's `type` and its type-specific config. The supported types, from the [property schema object reference](https://developers.notion.com/reference/property-schema-object):

> Possible values of this key are `"title"`, `"rich_text"`, `"number"`, `"select"`, `"multi_select"`, `"status"`, `"date"`, `"people"`, `"files"`, `"checkbox"`, `"url"`, `"email"`, `"phone_number"`, `"formula"`, `"relation"`, `"rollup"`, `"created_time"`, `"created_by"`, `"last_edited_time"`, `"last_edited_by"`.

**Exactly one `title` property is required:** "[Each database must have exactly one database property schema object of type `title`.](https://developers.notion.com/reference/property-schema-object)"

Example schema:

```json
{
  "Name": { "title": {} },
  "Status": {
    "select": { "options": [{ "name": "Todo" }, { "name": "Done" }] }
  },
  "Estimate": { "number": {} },
  "Due": { "date": {} }
}
```

`updateDataSource` takes the same shape keyed by existing property names; set a property's value to `null` to remove it.

## Page property values

When creating or updating a page, `properties` is keyed by property **name**, and each value's shape depends on that property's type. From the [page property values reference](https://developers.notion.com/reference/page-property-values):

| Type           | Value shape                                                                               |
| -------------- | ----------------------------------------------------------------------------------------- |
| `title`        | rich text array: `{ "title": [ { "type": "text", "text": { "content": "..." } } ] }`      |
| `rich_text`    | rich text array: `{ "rich_text": [ { "type": "text", "text": { "content": "..." } } ] }`  |
| `number`       | `{ "number": 42 }`                                                                        |
| `checkbox`     | `{ "checkbox": true }`                                                                    |
| `select`       | `{ "select": { "name": "Marketing" } }` (or `{ "id": "..." }`)                            |
| `multi_select` | `{ "multi_select": [ { "name": "TypeScript" }, { "name": "Python" } ] }`                  |
| `date`         | `{ "date": { "start": "2023-02-23" } }` or `{ "date": { "start": "...", "end": "..." } }` |
| `relation`     | `{ "relation": [ { "id": "<page-uuid>" } ] }`                                             |
| `people`       | `{ "people": [ { "object": "user", "id": "<user-uuid>" } ] }`                             |
| `url`          | `{ "url": "https://developers.notion.com/" }`                                             |
| `email`        | `{ "email": "ada@makenotion.com" }`                                                       |
| `phone_number` | `{ "phone_number": "415-202-4776" }`                                                      |

Notes:

- `select` / `multi_select`: the option `name` must match an option configured in the schema (or be a new one the workspace allows). Read valid options via `getDataSource`.
- `relation`: each `id` is a page id; resolve people ids via `listUsers` / `getUser`.
- A `relation` or `people` value is capped at 100 entries (see [notion-api-gotchas.md](notion-api-gotchas.md)); values over 25 read back truncated via `getPage` — use `getPageProperty` for the full list.
