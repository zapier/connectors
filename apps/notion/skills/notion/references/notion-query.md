# Notion query (filter + sort)

The `filter` and `sorts` syntax for `queryDataSource`. Filter conditions and sort property keys depend on each property's type — read the schema first with `getDataSource`.

## Filter

A `filter` is either a **single property condition** or a **compound** filter combining conditions with `and` / `or`.

### Single property condition

A condition names the `property` and nests a type-specific operator object. From the [query a data source reference](https://developers.notion.com/reference/query-a-data-source):

```json
{ "property": "Done", "checkbox": { "equals": true } }
```

The inner key (`checkbox` here) and its operator (`equals`) are specific to the property's type — e.g. text properties use `contains` / `equals`, numbers use `greater_than` / `less_than`, dates use `before` / `after` / `on_or_before`, select uses `equals`. Get each property's type from `getDataSource`.

### Compound filters (`and` / `or`)

Combine conditions with `and` or `or`. They can nest. From the [reference](https://developers.notion.com/reference/query-a-data-source):

```json
{
  "and": [
    { "property": "Done", "checkbox": { "equals": true } },
    {
      "or": [
        { "property": "Tags", "contains": "A" },
        { "property": "Tags", "contains": "B" }
      ]
    }
  ]
}
```

"[The set of filters and filter groups chained by 'And' in the UI is equivalent to having each filter in the array of the compound `and` filter.](https://developers.notion.com/reference/query-a-data-source)"

## Sorts

`sorts` is an array; each entry is a **property sort** or a **timestamp sort**, with a `direction` of `ascending` or `descending`. From the [reference](https://developers.notion.com/reference/query-a-data-source):

```json
[
  { "property": "Created", "direction": "descending" },
  { "timestamp": "created_time", "direction": "ascending" }
]
```

Timestamp sorts use `created_time` or `last_edited_time`. "[The order of the sorts in the request matter, with earlier sorts taking precedence over later ones.](https://developers.notion.com/reference/query-a-data-source)"

## Result limits

The query paginates with `start_cursor` / `page_size` (`page_size` max 100; see [notion-api-gotchas.md](notion-api-gotchas.md)). Across pages, a single query "[supports paginating through up to 10,000 results per query.](https://developers.notion.com/reference/query-a-data-source)" Beyond that, pagination stops at the 10,000th result. To narrow large data sources, filter rather than relying on paging to the end.
