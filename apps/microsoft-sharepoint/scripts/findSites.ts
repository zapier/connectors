#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  GRAPH,
  graphFetch,
  listUrl,
  unwrapList,
} from "../lib/microsoft-sharepoint.ts";

const inputSchema = z
  .object({
    search: z
      .string()
      .describe('Keyword matched against site name/title, e.g. "marketing".'),
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Maximum sites to return. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    cursor: z
      .string()
      .describe("Pagination cursor from a previous response's next_cursor.")
      .optional(),
  })
  .strict();

const siteSchema = z.object({
  id: z
    .string()
    .describe("Composite site id ({hostname},{siteCollectionId},{webId})."),
  name: z.string().describe("Site name.").optional(),
  displayName: z.string().describe("Human-friendly site title.").optional(),
  description: z.string().describe("Site description.").optional(),
  webUrl: z.string().describe("Site URL.").optional(),
  createdDateTime: z
    .string()
    .datetime({ offset: true })
    .describe("When the site was created (ISO 8601).")
    .optional(),
  lastModifiedDateTime: z
    .string()
    .datetime({ offset: true })
    .describe("When the site was last modified (ISO 8601).")
    .optional(),
});

const outputSchema = z.object({
  items: z.array(siteSchema).describe("Matching sites."),
  next_cursor: z
    .string()
    .describe("Cursor for the next page; absent on the last page.")
    .optional(),
});

const definition = defineTool({
  name: "findSites",
  title: "Find Sites",
  description:
    "Search SharePoint sites by keyword across the tenant. Returns each site's composite id — pass it verbatim to site-scoped tools. To resolve a site you already know by URL, use getSite instead.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-sharepoint",
  run: async (input, ctx) => {
    // `search` is the literal query param the site-search endpoint takes;
    // `limit` maps to OData `$top`, and `cursor` is the opaque @odata.nextLink.
    const url = listUrl(`${GRAPH}/sites`, input, { search: input.search });
    const res = await graphFetch(ctx.fetch, url);
    return unwrapList(await res.json());
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
