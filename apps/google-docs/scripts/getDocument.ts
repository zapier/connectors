#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { DOCS_BASE, GET_DOCUMENT_CHAR_BUDGET } from "../lib/constants.ts";
import {
  collectTabs,
  flattenDocumentText,
  walkElements,
  type WireDocument,
} from "../lib/docWalker.ts";
import { googleDocsFetch } from "../lib/googleDocsFetch.ts";

// The Docs API returns the entire document as a deep tree with no wire
// pagination or range parameter. run() reshapes it: a flattened readable `text`
// rendering AND `content[]` with each element's startIndex/endIndex so the agent
// can compute edit positions. Always reads with includeTabsContent=true (the API
// otherwise silently returns only tab 1) and a fixed `fields` mask to cut
// payload at the source.

const inputSchema = z
  .object({
    documentId: z
      .string()
      .describe(
        "Document id (the long token in the doc URL /document/d/<documentId>/edit). Resolve a title to an id with findDocuments.",
      ),
    startIndex: z
      .number()
      .int()
      .describe(
        "Optional. Return only structural elements overlapping this index range (start, inclusive). Omit for the whole document; pair with endIndex to read a known section without pulling the entire doc.",
      )
      .optional(),
    endIndex: z
      .number()
      .int()
      .describe("Optional range end (exclusive). Pair with startIndex.")
      .optional(),
    suggestionsViewMode: z
      .enum([
        "DEFAULT_FOR_CURRENT_ACCESS",
        "SUGGESTIONS_INLINE",
        "PREVIEW_SUGGESTIONS_ACCEPTED",
        "PREVIEW_WITHOUT_SUGGESTIONS",
      ])
      .describe(
        "Optional. How suggested edits appear in the returned content. Default shows them inline per the caller's access.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  documentId: z.string().describe("The document id (use in every other tool)."),
  title: z.string().describe("The document title."),
  revisionId: z
    .string()
    .describe("Current revision id; changes on every edit.")
    .optional(),
  text: z
    .string()
    .describe(
      "The whole document flattened to readable text (run() walks paragraphs, tables, and all tabs). For clean Markdown without structure, use exportDocument.",
    ),
  tabs: z
    .array(
      z.object({
        tabId: z
          .string()
          .describe("Pass as tabId to write tools to target this tab."),
        title: z.string().describe("The tab's title."),
        index: z.number().int().describe("Zero-based position among siblings."),
      }),
    )
    .describe(
      "Every tab in the document (single-tab docs have one entry with an empty tabId).",
    ),
  content: z
    .array(
      z.object({
        startIndex: z
          .number()
          .int()
          .describe("Element start (inclusive), zero-based UTF-16."),
        endIndex: z.number().int().describe("Element end (exclusive)."),
        tabId: z
          .string()
          .describe(
            "Which tab this element is in — thread it into a subsequent write so the edit doesn't land on tab 1.",
          ),
        type: z
          .enum(["paragraph", "table", "sectionBreak", "tableOfContents"])
          .describe("The structural element type."),
        text: z
          .string()
          .describe("The element's text (empty for non-paragraph elements)."),
      }),
    )
    .describe(
      "Structural elements with positions, for index-based edits (insertText/formatText/deleteContentRange).",
    ),
  inlineObjects: z
    .record(z.string(), z.json())
    .describe(
      "Map of inline-object id to its properties. An image's object id (the imageObjectId for replaceImage) is the key here.",
    ),
  truncated: z
    .boolean()
    .describe(
      "True if content[] was capped at the size budget; re-read a range with startIndex/endIndex or use exportDocument(markdown).",
    ),
});

const definition = defineTool({
  name: "getDocument",
  title: "Get Document",
  description:
    "Read a document's structured content — flattened readable text plus the index positions needed for editing — across all tabs. Use this when you need to edit at a position; for plain reading prefer exportDocument(markdown). Resolve a title to a documentId with findDocuments first.",
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
    // Always read complete; a fixed mask drops doc-level styling bloat at source.
    url.searchParams.set("includeTabsContent", "true");
    url.searchParams.set(
      "fields",
      "documentId,title,revisionId,inlineObjects,body/content,tabs/tabProperties,tabs/documentTab/body/content,tabs/childTabs",
    );
    if (input.suggestionsViewMode !== undefined) {
      url.searchParams.set("suggestionsViewMode", input.suggestionsViewMode);
    }
    const res = await googleDocsFetch(
      ctx.fetch,
      url.toString(),
      { method: "GET" },
      "getDocument",
    );
    const doc = (await res.json()) as WireDocument;

    const tabs = collectTabs(doc).map((t) => ({
      tabId: t.tabId,
      title: t.title,
      index: t.index,
    }));

    let elements = walkElements(doc);
    if (input.startIndex !== undefined || input.endIndex !== undefined) {
      const lo = input.startIndex ?? -Infinity;
      const hi = input.endIndex ?? Infinity;
      elements = elements.filter(
        (el) => el.endIndex > lo && el.startIndex < hi,
      );
    }

    // Truncate-and-point: accumulate elements until the flattened text reaches
    // the budget, then flag truncated so the agent reads a range or exports.
    const content: typeof elements = [];
    let budget = 0;
    let truncated = false;
    for (const el of elements) {
      if (budget >= GET_DOCUMENT_CHAR_BUDGET) {
        truncated = true;
        break;
      }
      content.push(el);
      budget += el.text.length;
    }

    return {
      documentId: doc.documentId ?? input.documentId,
      title: doc.title ?? "",
      revisionId: doc.revisionId,
      text: flattenDocumentText(doc),
      tabs,
      content,
      inlineObjects: doc.inlineObjects ?? {},
      truncated,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
