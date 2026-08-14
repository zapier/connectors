#!/usr/bin/env node
// The Microsoft Search API is a POST /search/query whose request wraps the query
// in a `requests[]` envelope and whose response nests the hits under
// `value[].hitsContainers[].hits[].resource`, so this tool assembles the request
// and unwraps the response by hand rather than as a plain single-GET list op.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  driveItemSchema,
  GRAPH,
  graphFetch,
} from "../lib/microsoft-onedrive.ts";

const DEFAULT_LIMIT = 20;

const inputSchema = z
  .object({
    query: z
      .string()
      .describe(
        "Keyword or KQL query, e.g. `filetype:docx AND budget`. Matched by the Microsoft Search index across the caller's own and shared items.",
      ),
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Maximum items to return. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    cursor: z
      .string()
      .describe(
        "Offset cursor from a previous response's next_cursor (paging by result offset).",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  items: z
    .array(driveItemSchema)
    .describe(
      "Matching files and folders. Shared items carry a remoteItem facet addressing them on the owner's drive.",
    ),
  next_cursor: z
    .string()
    .describe("Cursor for the next page; absent when no more results.")
    .optional(),
});

interface SearchResponse {
  value?: Array<{
    hitsContainers?: Array<{
      hits?: Array<{ resource?: unknown }>;
      moreResultsAvailable?: boolean;
    }>;
  }>;
}

const definition = defineTool({
  name: "findItemsByKql",
  title: "Find Items By KQL",
  description:
    "Search across the caller's own and shared files/folders via the Microsoft Search API using a keyword or KQL query. Use this (not findFiles) to reach content shared with the caller. Newly created items may lag the search index.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-onedrive",
  run: async (input, ctx) => {
    const from = input.cursor ? Number(input.cursor) : 0;
    const size = input.limit ?? DEFAULT_LIMIT;
    const body = {
      requests: [
        {
          entityTypes: ["driveItem"],
          query: { queryString: input.query },
          from,
          size,
        },
      ],
    };
    const res = await graphFetch(ctx.fetch, `${GRAPH}/search/query`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as SearchResponse;
    // Unwrap the nested Search shape: one request → one hitsContainer of hits,
    // each carrying the driveItem on `resource`.
    const container = json.value?.[0]?.hitsContainers?.[0];
    const items = (container?.hits ?? [])
      .map((hit) => hit.resource)
      .filter((resource): resource is object => resource != null);
    // The Search API pages by offset, not an opaque token: advance from+size.
    const more = container?.moreResultsAvailable === true;
    return {
      items,
      ...(more ? { next_cursor: String(from + size) } : {}),
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
