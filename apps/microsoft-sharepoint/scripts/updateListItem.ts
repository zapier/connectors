#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { GRAPH, graphFetch } from "../lib/microsoft-sharepoint.ts";

const inputSchema = z
  .object({
    siteId: z.string().describe("Site id from findSites."),
    listId: z.string().describe("List id from listLists."),
    itemId: z.string().describe("List item id."),
    fields: z
      .record(z.string(), z.json())
      .describe(
        "Column values to change, keyed by internal column name (from listColumns) — only the keys sent are modified. Multi-select choice columns take an array of plain values (the connector adds the multi-value marker Graph requires).",
      ),
  })
  .strict();

// The /fields endpoint returns the bare fieldValueSet (column values keyed by
// internal column name), not a wrapping list item. defineTool requires a
// ZodObject output, so model the open-ended set as an object with a json
// catchall rather than a top-level z.record.
const outputSchema = z
  .object({})
  .catchall(z.json())
  .describe(
    "The updated field value set — column values keyed by internal column name.",
  );

// Graph requires multi-value column writes to carry a sibling
// `"{col}@odata.type": "Collection(Edm.String)"` marker. The agent passes plain
// values (an array for a multi-select choice column); we stamp the marker here
// so the wire plumbing never leaks onto the agent surface.
//
// v2 tripwire: this tags every array as `Collection(Edm.String)`, correct for
// the only multi-value type v1 writes (multi-select choice). Multi-value
// lookup/person/group columns want `Collection(Edm.Int32)` — they're documented
// not-writable in v1, so an array write to one fails as documented rather than
// corrupting data. When v1 write scope expands to those types, buildFields must
// become column-type-aware (read the type facet from listColumns) instead of
// inferring purely from `Array.isArray`.
function buildFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = value;
    if (Array.isArray(value)) {
      out[`${key}@odata.type`] = "Collection(Edm.String)";
    }
  }
  return out;
}

const definition = defineTool({
  name: "updateListItem",
  title: "Update List Item",
  description:
    "Update column values on a list item — only the keys you send change. Provide values keyed by internal column name (from listColumns); multi-select choice columns take an array.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-sharepoint",
  run: async (input, ctx) => {
    // The /fields endpoint takes the fieldValueSet as the whole body (not
    // wrapped in a `fields` key) and returns the updated fieldValueSet.
    const url = `${GRAPH}/sites/${encodeURIComponent(input.siteId)}/lists/${encodeURIComponent(input.listId)}/items/${encodeURIComponent(input.itemId)}/fields`;
    const res = await graphFetch(ctx.fetch, url, {
      method: "PATCH",
      body: JSON.stringify(buildFields(input.fields)),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
