#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  GRAPH,
  graphFetch,
  sitePageSchema,
} from "../lib/microsoft-sharepoint.ts";

const inputSchema = z
  .object({
    siteId: z.string().describe("Site id from findSites."),
    title: z.string().describe("Page title."),
    name: z
      .string()
      .describe(
        "URL file name (.aspx appended if missing). Defaults from the title.",
      )
      .optional(),
    description: z.string().describe("Page description.").optional(),
    pageLayout: z
      .enum(["article", "home"])
      .describe("Page layout. Defaults to article.")
      .optional(),
    content: z
      .string()
      .describe(
        "Optional page body as HTML (headings, paragraphs, lists, links, bold/italic). This tool renders it as a single text web part; it doesn't build image, embed, or other web parts. Omit for a page with no body.",
      )
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "createPage",
  title: "Create Page",
  description:
    "Create a new site page, optionally with text body content. Creates a draft — call publishPage to make it live.",
  inputSchema,
  outputSchema: sitePageSchema.describe("The created (draft) site page."),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "microsoft-sharepoint",
  run: async (input, ctx) => {
    const url = `${GRAPH}/sites/${encodeURIComponent(input.siteId)}/pages`;
    // Graph rejects the create with `400 badArgument` unless the body carries a
    // page `name` (the .aspx file name). Honor an explicit name; otherwise
    // derive one from the title (the documented default). Ensure exactly one
    // trailing `.aspx` in both cases.
    const rawName = (input.name ?? input.title).replace(/\.aspx$/i, "").trim();
    const baseName =
      (input.name !== undefined
        ? rawName
        : rawName.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "")) ||
      "page";
    // Graph fails to parse the create unless the body carries the sitePage
    // type discriminator.
    const body: Record<string, unknown> = {
      "@odata.type": "#microsoft.graph.sitePage",
      title: input.title,
      name: `${baseName}.aspx`,
      ...(input.description ? { description: input.description } : {}),
      pageLayout: input.pageLayout ?? "article",
    };
    // `content` HTML → the fixed single text-web-part canvasLayout skeleton:
    // one oneColumn horizontal section → one column → one text web part whose
    // innerHtml is the supplied HTML. Everything but the HTML is a constant.
    if (input.content !== undefined) {
      body["canvasLayout"] = {
        horizontalSections: [
          {
            layout: "oneColumn",
            id: "1",
            columns: [
              {
                id: "1",
                webparts: [
                  {
                    "@odata.type": "#microsoft.graph.textWebPart",
                    innerHtml: input.content,
                  },
                ],
              },
            ],
          },
        ],
      };
    }
    const res = await graphFetch(ctx.fetch, url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
