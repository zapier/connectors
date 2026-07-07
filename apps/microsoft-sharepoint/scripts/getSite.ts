#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { GRAPH, graphFetch } from "../lib/microsoft-sharepoint.ts";

const inputSchema = z
  .object({
    siteId: z
      .string()
      .describe(
        'Composite site id from findSites, "root", or {hostname}:/{server-relative-path}.',
      ),
  })
  .strict();

// Richer than findSites' item: getSite returns the site's collection host and
// its underlying SharePoint GUIDs, both useful for resolving/verifying a site.
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
  siteCollection: z
    .object({
      hostname: z.string().describe("Site collection hostname.").optional(),
    })
    .describe("Site collection facet.")
    .optional(),
  sharepointIds: z
    .object({
      siteId: z.string().describe("Site-collection GUID.").optional(),
      webId: z.string().describe("Web GUID.").optional(),
    })
    .describe("The site's underlying SharePoint GUIDs.")
    .optional(),
});

const definition = defineTool({
  name: "getSite",
  title: "Get Site",
  description:
    'Retrieve a site\'s metadata. Accepts a composite site id from findSites, the literal "root" for the tenant root, or a hostname:/server-relative-path form to resolve a known URL to its id.',
  inputSchema,
  outputSchema: siteSchema.describe("The requested site."),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-sharepoint",
  run: async (input, ctx) => {
    // A single site GET, not a list. siteId may be a composite id, "root", or a
    // {hostname}:/{path} address — Graph accepts the encoded colon-path form.
    const url = `${GRAPH}/sites/${encodeURIComponent(input.siteId)}`;
    const res = await graphFetch(ctx.fetch, url);
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
