#!/usr/bin/env node
// Multi-step, cross-host composition: Drive files.copy (www.googleapis.com) clones the
// template, then a Docs batchUpdate of ReplaceAllText fills each {{placeholder}}.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  batchUpdate,
  type BatchUpdateRequest,
  withReadinessRetry,
} from "../lib/batchUpdate.ts";
import { documentUrl, DRIVE_BASE } from "../lib/constants.ts";
import { googleDocsFetch } from "../lib/googleDocsFetch.ts";

const inputSchema = z
  .object({
    templateId: z
      .string()
      .describe(
        "Document id of the template to copy. Resolve with findDocuments.",
      ),
    title: z.string().describe("Title for the new document."),
    replacements: z
      .record(z.string(), z.string())
      .describe(
        'Map of placeholder → replacement value, e.g. { "{{name}}": "Ada" }. Keys are the literal placeholder text including braces; each becomes a case-sensitive find-and-replace.',
      )
      .optional(),
    folder: z
      .string()
      .describe(
        "Drive folder id for the new document. Omit for the user's Drive root.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  documentId: z.string().describe("The new document id."),
  title: z.string().describe("The new document title."),
  url: z.string().describe("The document's edit URL."),
  replacementsApplied: z
    .array(
      z.object({
        placeholder: z.string().describe("The placeholder key."),
        occurrencesChanged: z
          .number()
          .int()
          .describe(
            "How many occurrences were replaced. 0 means the placeholder matched nothing (typo, casing, or already consumed).",
          ),
      }),
    )
    .describe("Per-placeholder replacement counts."),
});

interface DriveCopyResponse {
  id?: string;
}
interface ReplaceAllReply {
  replaceAllText?: { occurrencesChanged?: number };
}

const definition = defineTool({
  name: "createDocumentFromTemplate",
  title: "Create Document From Template",
  description:
    "Copy a template document and fill in its {{placeholder}} tokens with a replacement map. Returns per-placeholder occurrence counts so you can see any placeholder that didn't match. Resolve the templateId with findDocuments.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-docs",
  run: async (input, ctx) => {
    // 1. Clone the template via Drive (sets the new title + optional parent).
    const copyBody: Record<string, unknown> = { name: input.title };
    if (input.folder) copyBody.parents = [input.folder];
    const copyRes = await googleDocsFetch(
      ctx.fetch,
      `${DRIVE_BASE}/files/${encodeURIComponent(input.templateId)}/copy?supportsAllDrives=true`,
      { method: "POST", body: JSON.stringify(copyBody) },
      "createDocumentFromTemplate",
    );
    const copied = (await copyRes.json()) as DriveCopyResponse;
    if (!copied.id) {
      throw new Error(
        "Google Docs createDocumentFromTemplate: Drive did not return an id for the copied document.",
      );
    }
    const documentId = copied.id;

    // 2. Replace each placeholder via one batchUpdate (skip if none — an empty
    //    requests array is a 400).
    const entries = Object.entries(input.replacements ?? {});
    let replacementsApplied: {
      placeholder: string;
      occurrencesChanged: number;
    }[] = [];
    if (entries.length > 0) {
      const requests: BatchUpdateRequest[] = entries.map(
        ([text, replaceText]) => ({
          replaceAllText: {
            containsText: { text, matchCase: true },
            replaceText,
          },
        }),
      );
      const replies = await withReadinessRetry(() =>
        batchUpdate(
          ctx.fetch,
          documentId,
          requests,
          "createDocumentFromTemplate",
        ),
      );
      replacementsApplied = entries.map(([placeholder], i) => ({
        placeholder,
        occurrencesChanged:
          (replies[i] as ReplaceAllReply | undefined)?.replaceAllText
            ?.occurrencesChanged ?? 0,
      }));
    }

    return {
      documentId,
      title: input.title,
      url: documentUrl(documentId),
      replacementsApplied,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
