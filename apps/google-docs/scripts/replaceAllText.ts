#!/usr/bin/env node
// batchUpdate-union request type (ReplaceAllText) posted to the shared :batchUpdate endpoint. run() surfaces
// the occurrencesChanged count the reply carries (0 is a silent no-op).
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { batchUpdate } from "../lib/batchUpdate.ts";

const inputSchema = z
  .object({
    documentId: z
      .string()
      .describe(
        "Document id (the token in the doc URL). Resolve a title to an id with findDocuments.",
      ),
    find: z.string().describe("Exact text to find."),
    replace: z
      .string()
      .describe(
        "Replacement text. Pass an empty string to delete the matched text.",
      ),
    matchCase: z
      .boolean()
      .describe("Whether the match is case-sensitive. Defaults to false.")
      .default(false),
    tabId: z
      .string()
      .describe(
        "Restrict the replace to this tab. OMIT to replace across ALL tabs — note this is the opposite default from the positional tools (insertText/formatText default to tab 1).",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  documentId: z.string().describe("The document that was edited."),
  occurrencesChanged: z
    .number()
    .int()
    .describe(
      "How many occurrences were replaced. 0 is a success but a no-op (typo, casing, whitespace, or smart-quotes) — treat it as a warning, not a silent success.",
    ),
});

interface ReplaceAllReply {
  replaceAllText?: { occurrencesChanged?: number };
}

const definition = defineTool({
  name: "replaceAllText",
  title: "Replace All Text",
  description:
    "Find and replace all occurrences of a string across the document (best for unique placeholder tags like {{name}}). Returns occurrencesChanged — when this is 0, the search string was not found; tell the user no matches were found rather than reporting success. For a positional replace, or when the target text appears multiple times and only one instance should change, use findText then deleteContentRange + insertText.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-docs",
  run: async (input, ctx) => {
    const replaceAllText: Record<string, unknown> = {
      containsText: { text: input.find, matchCase: input.matchCase },
      replaceText: input.replace,
    };
    // tabId RESTRICTS scope here (the request otherwise defaults to all tabs).
    if (input.tabId) replaceAllText.tabsCriteria = { tabIds: [input.tabId] };

    const replies = await batchUpdate(
      ctx.fetch,
      input.documentId,
      [{ replaceAllText }],
      "replaceAllText",
    );
    const occurrencesChanged =
      (replies[0] as ReplaceAllReply | undefined)?.replaceAllText
        ?.occurrencesChanged ?? 0;
    return { documentId: input.documentId, occurrencesChanged };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
