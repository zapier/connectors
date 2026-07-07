#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  GRAPH,
  graphFetch,
  listItemSchema,
} from "../lib/microsoft-sharepoint.ts";

const inputSchema = z
  .object({
    siteId: z.string().describe("Site id from findSites."),
    listId: z.string().describe("List id from listLists."),
    fields: z
      .record(z.string(), z.json())
      .describe(
        'Column values keyed by internal column name (discover via listColumns), e.g. { "Title": "Q3" }. Multi-select choice columns take an array of plain values (the connector adds the multi-value marker Graph requires). Person/group and multi-value lookup columns aren\'t writable.',
      ),
  })
  .strict();

const outputSchema = listItemSchema;

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
  name: "createListItem",
  title: "Create List Item",
  description:
    "Create a new item in a list. Provide column values in the fields object keyed by internal column name (from listColumns); for a multi-select choice column pass an array of values.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "microsoft-sharepoint",
  run: async (input, ctx) => {
    const url = `${GRAPH}/sites/${encodeURIComponent(input.siteId)}/lists/${encodeURIComponent(input.listId)}/items`;
    const res = await graphFetch(ctx.fetch, url, {
      method: "POST",
      body: JSON.stringify({ fields: buildFields(input.fields) }),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
