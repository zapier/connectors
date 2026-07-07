#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  GRAPH,
  graphFetch,
  sharePointListSchema,
} from "../lib/microsoft-sharepoint.ts";

const inputSchema = z
  .object({
    siteId: z.string().describe("Site id from findSites."),
    displayName: z.string().describe("List name."),
    description: z.string().describe("List description.").optional(),
    template: z
      .enum([
        "genericList",
        "documentLibrary",
        "survey",
        "links",
        "announcements",
        "contacts",
        "events",
        "tasks",
      ])
      .describe("List template. Defaults to genericList.")
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "createList",
  title: "Create List",
  description:
    "Create a new list in a site. Requires the Sites.Manage.All permission (higher than the read/write tools).",
  inputSchema,
  outputSchema: sharePointListSchema.describe("The created list."),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "microsoft-sharepoint",
  run: async (input, ctx) => {
    const url = `${GRAPH}/sites/${encodeURIComponent(input.siteId)}/lists`;
    // The template goes under the `list` facet object, not top-level.
    const body = {
      displayName: input.displayName,
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      list: { template: input.template ?? "genericList" },
    };
    const res = await graphFetch(ctx.fetch, url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
