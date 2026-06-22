#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { DOCS_BASE } from "../lib/constants.ts";
import {
  collectInlineObjects,
  collectSegments,
  collectTables,
  collectTabs,
  walkElements,
  type WireDocument,
} from "../lib/docWalker.ts";
import { googleDocsFetch } from "../lib/googleDocsFetch.ts";

// The Docs API returns the entire document as a deep tree with no wire
// pagination or range parameter. run() reshapes it into `content[]`: top-level
// structural elements with each element's startIndex/endIndex so the agent can
// compute edit positions. This is the structure/index tool, not a reading tool —
// it returns no whole-document text rendering; for reading use exportDocument.
// Always reads with includeTabsContent=true (the API otherwise silently returns
// only tab 1) and a fixed `fields` mask to cut payload at the source.

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
        table: z
          .object({
            rows: z.number().int().describe("Number of rows."),
            columns: z.number().int().describe("Number of columns."),
          })
          .describe(
            "Present only for table elements. Pass this element's startIndex as modifyTable's tableStartIndex; rows/columns bound the valid rowIndex/columnIndex.",
          )
          .optional(),
      }),
    )
    .describe(
      "Structural elements with positions, for index-based edits (insertText/formatText/deleteContentRange) and table edits (modifyTable).",
    ),
  inlineObjects: z
    .record(z.string(), z.json())
    .describe(
      "Map of inline-object id to its properties. An image's object id (the imageObjectId for replaceImage) is the key here.",
    ),
  segments: z
    .object({
      headerIds: z.array(z.string()).describe("Header segment ids."),
      footerIds: z.array(z.string()).describe("Footer segment ids."),
      footnoteIds: z.array(z.string()).describe("Footnote segment ids."),
    })
    .describe(
      "Header/footer/footnote segment ids — pass one as segmentId to insertText / formatText to write into that segment.",
    ),
});

const definition = defineTool({
  name: "getDocument",
  title: "Get Document",
  description:
    "Read a document's structure and the index positions needed for editing, across all tabs. Use this when you need to edit at a position; for plain reading or summarizing a whole document, use exportDocument(markdown). Resolve a title to a documentId with findDocuments first.",
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
      "documentId,title,revisionId,tabs/tabProperties,tabs/documentTab/inlineObjects,tabs/documentTab/headers,tabs/documentTab/footers,tabs/documentTab/footnotes,tabs/documentTab/body/content,tabs/childTabs",
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

    // Attach table dimensions so modifyTable has the tableStartIndex (the table
    // element's startIndex) plus valid row/column bounds.
    const tableDims = new Map(
      collectTables(doc).map((t) => [
        `${t.tabId}:${t.startIndex}`,
        { rows: t.rows, columns: t.columns },
      ]),
    );
    const content = elements.map((el) =>
      el.type === "table"
        ? { ...el, table: tableDims.get(`${el.tabId}:${el.startIndex}`) }
        : el,
    );

    // No client-side cap: return every structural element the API returned
    // (optionally scoped by the range read above). documents.get can't paginate,
    // so large whole-document reads go through exportDocument (bounded by Drive's
    // 10MB export cap); the agent trims a large result with filterOutputData.
    return {
      documentId: doc.documentId ?? input.documentId,
      title: doc.title ?? "",
      revisionId: doc.revisionId,
      tabs,
      content,
      inlineObjects: collectInlineObjects(doc),
      segments: collectSegments(doc),
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
