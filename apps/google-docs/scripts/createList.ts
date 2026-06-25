#!/usr/bin/env node
// batchUpdate-union request types over a
// paragraph range. CreateParagraphBullets both applies a list to plain
// paragraphs AND changes the preset of an existing list (per the Docs API "Work
// with lists" guide), so the flat path is a single request — no delete needed
// (DeleteParagraphBullets adds indentation to preserve nesting, which would
// leave spurious indent on a style conversion).
//
// Nesting (`levels`) uses the API's mechanism: the nesting level of each
// paragraph is "determined by counting leading tabs in front of each paragraph"
// and those tabs are removed by the request. So run() reads the target
// paragraphs, inserts the right number of leading tabs (descending by index so
// earlier inserts don't shift later targets), then applies the bullets over the
// tab-expanded range in one atomic batch. The tab path is index-mutating and is
// validated by the eval harness, not mocks.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { batchUpdate, type BatchUpdateRequest } from "../lib/batchUpdate.ts";
import { DOCS_BASE } from "../lib/constants.ts";
import { walkElements, type WireDocument } from "../lib/docWalker.ts";
import { googleDocsFetch } from "../lib/googleDocsFetch.ts";
import { bulletPresetFor } from "../lib/paragraph.ts";
import { locationOf, rangeOf } from "../lib/range.ts";
import { editSuccessOutput } from "../lib/schemas.ts";

const inputSchema = z
  .object({
    documentId: z
      .string()
      .describe(
        "Document id (the token in the doc URL). Resolve a title to an id with findDocuments.",
      ),
    startIndex: z
      .number()
      .int()
      .describe(
        "Range start (inclusive), zero-based UTF-16. From findText / getDocument.",
      ),
    endIndex: z.number().int().describe("Range end (exclusive)."),
    style: z
      .enum(["bullet", "numbered"])
      .describe(
        "List style: bullet (default) or numbered. Applying a style to an existing list of the other style converts it.",
      )
      .default("bullet"),
    levels: z
      .array(z.number().int().min(0))
      .describe(
        "Optional per-paragraph nesting level (0-based), in document order over the range — e.g. [0,1,1,0] for a list with two nested items. Length must equal the number of paragraphs in the range. Omit for a flat list.",
      )
      .optional(),
    tabId: z
      .string()
      .describe(
        "Optional target tab id (from getDocument). Omit for a single-tab document.",
      )
      .optional(),
  })
  .strict();

/** Read the paragraphs overlapping [start, end) in document order, with indices. */
async function paragraphsInRange(
  fetch: typeof globalThis.fetch,
  documentId: string,
  startIndex: number,
  endIndex: number,
  tabId: string | undefined,
): Promise<{ startIndex: number; endIndex: number }[]> {
  const url = new URL(
    `${DOCS_BASE}/documents/${encodeURIComponent(documentId)}`,
  );
  url.searchParams.set("includeTabsContent", "true");
  url.searchParams.set(
    "fields",
    "tabs/tabProperties,tabs/documentTab/body/content,tabs/childTabs",
  );
  const res = await googleDocsFetch(
    fetch,
    url.toString(),
    { method: "GET" },
    "createList",
  );
  const doc = (await res.json()) as WireDocument;
  return walkElements(doc)
    .filter(
      (el) =>
        el.type === "paragraph" &&
        el.endIndex > startIndex &&
        el.startIndex < endIndex &&
        (tabId === undefined || el.tabId === tabId),
    )
    .map((el) => ({ startIndex: el.startIndex, endIndex: el.endIndex }));
}

const definition = defineTool({
  name: "createList",
  title: "Create List",
  description:
    "Turn a range of paragraphs into a bulleted or numbered list — or change an existing list between the two. Pass levels for nested lists. Affects every paragraph the range overlaps. Operate on a range from findText / getDocument; indices go stale after edits.",
  inputSchema,
  outputSchema: editSuccessOutput,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-docs",
  run: async (input, ctx) => {
    const preset = bulletPresetFor(input.style);

    // Flat list (no nesting): one request both applies a fresh list and changes
    // the preset of an existing one.
    if (!input.levels || input.levels.every((l) => l === 0)) {
      await batchUpdate(
        ctx.fetch,
        input.documentId,
        [
          {
            createParagraphBullets: {
              range: rangeOf(input.startIndex, input.endIndex, input.tabId),
              bulletPreset: preset,
            },
          },
        ],
        "createList",
      );
      return { documentId: input.documentId, success: true as const };
    }

    // Nested list: insert leading tabs per paragraph, then bullet the expanded
    // range. CreateParagraphBullets counts and removes the tabs to set nesting.
    const paragraphs = await paragraphsInRange(
      ctx.fetch,
      input.documentId,
      input.startIndex,
      input.endIndex,
      input.tabId,
    );
    if (input.levels.length !== paragraphs.length) {
      throw new Error(
        `Google Docs createList: levels has ${input.levels.length} entries but the range covers ${paragraphs.length} paragraph(s). Pass one level per paragraph, in document order.`,
      );
    }

    const requests: BatchUpdateRequest[] = [];
    let totalTabs = 0;
    // Insert descending by index so each insertion's target index stays valid
    // (prior inserts were all at higher indices and don't shift lower ones).
    const indexed = paragraphs.map((p, i) => ({ p, level: input.levels![i] }));
    for (let i = indexed.length - 1; i >= 0; i--) {
      const { p, level } = indexed[i];
      if (level > 0) {
        requests.push({
          insertText: {
            text: "\t".repeat(level),
            location: locationOf(p.startIndex, input.tabId),
          },
        });
      }
    }
    for (const { level } of indexed) totalTabs += level;

    requests.push({
      createParagraphBullets: {
        range: rangeOf(
          input.startIndex,
          input.endIndex + totalTabs,
          input.tabId,
        ),
        bulletPreset: preset,
      },
    });

    await batchUpdate(ctx.fetch, input.documentId, requests, "createList");
    return { documentId: input.documentId, success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
