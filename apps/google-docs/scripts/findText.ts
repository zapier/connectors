#!/usr/bin/env node
// Authored by the implementation agent: a multi-step read codegen can't
// scaffold — no single Docs call does text search, so run() reads the document
// (includeTabsContent=true) and walks the structural tree (recursing tables and
// tabs) to return match ranges. This is the index resolver for formatText /
// deleteContentRange.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { DOCS_BASE } from "../lib/constants.ts";
import { findMatches, type WireDocument } from "../lib/docWalker.ts";
import { googleDocsFetch } from "../lib/googleDocsFetch.ts";

const inputSchema = z
  .object({
    documentId: z
      .string()
      .describe(
        "Document id (the token in the doc URL). Resolve a title to an id with findDocuments.",
      ),
    query: z.string().describe("Text to locate."),
    matchCase: z
      .boolean()
      .describe("Case-sensitive match. Defaults to false.")
      .default(false),
  })
  .strict();

const outputSchema = z.object({
  documentId: z.string().describe("The searched document id."),
  matches: z
    .array(
      z.object({
        text: z.string().describe("The matched text."),
        startIndex: z
          .number()
          .int()
          .describe("Match start (inclusive), zero-based UTF-16."),
        endIndex: z.number().int().describe("Match end (exclusive)."),
        tabId: z
          .string()
          .describe(
            "Which tab the match is in — thread it into the follow-up edit.",
          ),
      }),
    )
    .describe(
      "All matches in document order. Empty = not found (not an error). Indices are valid only against the current revision — re-run after any edit.",
    ),
});

const definition = defineTool({
  name: "findText",
  title: "Find Text",
  description:
    "Locate occurrences of a phrase and return each match's {startIndex, endIndex, tabId} — the index resolver to call before formatText or deleteContentRange. Searches inside tables and every tab. An empty matches array means not found.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-docs",
  run: async (input, ctx) => {
    const url = new URL(
      `${DOCS_BASE}/documents/${encodeURIComponent(input.documentId)}`,
    );
    url.searchParams.set("includeTabsContent", "true");
    url.searchParams.set(
      "fields",
      "tabs/tabProperties,tabs/documentTab/body/content,tabs/childTabs",
    );
    const res = await googleDocsFetch(
      ctx.fetch,
      url.toString(),
      { method: "GET" },
      "findText",
    );
    const doc = (await res.json()) as WireDocument;
    return {
      documentId: input.documentId,
      matches: findMatches(doc, input.query, input.matchCase),
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
