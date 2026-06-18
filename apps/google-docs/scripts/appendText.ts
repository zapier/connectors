#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { batchUpdate } from "../lib/batchUpdate.ts";
import { DOCS_BASE } from "../lib/constants.ts";
import { collectTabs, type WireDocument } from "../lib/docWalker.ts";
import { googleDocsFetch } from "../lib/googleDocsFetch.ts";
import { renderMarkdownRequests } from "../lib/markdown.ts";
import { endOfSegment } from "../lib/range.ts";
import { editSuccessOutput } from "../lib/schemas.ts";

// Appends to the end of the body. Plain text uses InsertText with
// endOfSegmentLocation — no index math, dodging the off-by-one against the
// body's implicit final newline. Markdown rendering needs explicit indices
// (the styling requests anchor to known offsets), so the markdown path first
// reads the target segment's end index, then inserts there. Markdown is
// tractable on append because run() owns the indices of the content it inserts.

const inputSchema = z
  .object({
    documentId: z
      .string()
      .describe(
        "Document id (the token in the doc URL). Resolve a title to an id with findDocuments.",
      ),
    text: z
      .string()
      .describe(
        "Text to append at the end of the document body. Plain text unless markdown is true. Include leading/trailing newlines in the text as desired; the connector does not inject any.",
      ),
    markdown: z
      .boolean()
      .describe(
        "When true, `text` is rendered as Markdown: headings (#..######), bold/italic, links, and bulleted/numbered lists become real formatting. Unsupported Markdown (tables, images, code fences) is inserted as literal text. Defaults to false (plain text).",
      )
      .default(false),
    tabId: z
      .string()
      .describe(
        "Optional target tab id (from getDocument). Omit for a single-tab document.",
      )
      .optional(),
  })
  .strict();

/** Read the target segment's end index so Markdown styling can anchor to it. */
async function segmentEndIndex(
  fetch: typeof globalThis.fetch,
  documentId: string,
  tabId: string | undefined,
): Promise<number> {
  const url = new URL(
    `${DOCS_BASE}/documents/${encodeURIComponent(documentId)}`,
  );
  url.searchParams.set("includeTabsContent", "true");
  url.searchParams.set(
    "fields",
    "body/content,tabs/tabProperties,tabs/documentTab/body/content,tabs/childTabs",
  );
  const res = await googleDocsFetch(
    fetch,
    url.toString(),
    { method: "GET" },
    "appendText",
  );
  const doc = (await res.json()) as WireDocument;
  const tabs = collectTabs(doc);
  const target = tabId ? tabs.find((t) => t.tabId === tabId) : tabs[0];
  const content = target?.content ?? [];
  let end = 1;
  for (const el of content) {
    if (typeof el.endIndex === "number" && el.endIndex > end) end = el.endIndex;
  }
  return end;
}

const definition = defineTool({
  name: "appendText",
  title: "Append Text",
  description:
    "Append text (optionally rendered from Markdown) to the end of a document — the safe 'add to the end' path with no index math. For inserting at a specific position use insertText.",
  inputSchema,
  outputSchema: editSuccessOutput,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-docs",
  run: async (input, ctx) => {
    if (input.markdown) {
      // Markdown styling needs explicit indices; anchor at the segment end
      // (before the implicit final newline).
      const end = await segmentEndIndex(
        ctx.fetch,
        input.documentId,
        input.tabId,
      );
      const anchor = Math.max(1, end - 1);
      const requests = renderMarkdownRequests(input.text, anchor, input.tabId);
      await batchUpdate(ctx.fetch, input.documentId, requests, "appendText");
    } else {
      await batchUpdate(
        ctx.fetch,
        input.documentId,
        [
          {
            insertText: {
              text: input.text,
              endOfSegmentLocation: endOfSegment(input.tabId),
            },
          },
        ],
        "appendText",
      );
    }
    return { documentId: input.documentId, success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
