#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z
      .string()
      .describe("Index to add the synonym to. From listIndices."),
    objectID: z
      .string()
      .describe("Synonym id (create new or replace existing)."),
    type: z
      .enum([
        "synonym",
        "oneWaySynonym",
        "altCorrection1",
        "altCorrection2",
        "placeholder",
      ])
      .describe("Synonym kind."),
    synonyms: z
      .array(z.string())
      .describe(
        'Equivalent terms (type=synonym) or targets (type=oneWaySynonym), e.g. ["phone","mobile"].',
      )
      .optional(),
    input: z
      .string()
      .describe("Source term for oneWaySynonym / altCorrection* / placeholder.")
      .optional(),
    corrections: z
      .array(z.string())
      .describe("Corrected terms for altCorrection1/2.")
      .optional(),
    forwardToReplicas: z
      .boolean()
      .describe("Apply to replicas too. Default false.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  taskID: z
    .number()
    .int()
    .describe("Async task id — poll getTask until published."),
  id: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "saveSynonym",
  title: "Save Synonym",
  description:
    "Create or replace a single synonym. Shape varies by type: synonym uses synonyms[]; oneWaySynonym uses input + synonyms[]; altCorrection* use input + corrections[].",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "algolia",
  run: async (input, ctx) => {
    const url = new URL(
      `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/synonyms/${encodeURIComponent(input.objectID)}`,
    );
    if (input.forwardToReplicas !== undefined) {
      url.searchParams.set(
        "forwardToReplicas",
        String(input.forwardToReplicas),
      );
    }
    const body: Record<string, unknown> = {};
    if (input.type !== undefined) body["type"] = input.type;
    if (input.synonyms !== undefined) body["synonyms"] = input.synonyms;
    if (input.input !== undefined) body["input"] = input.input;
    if (input.corrections !== undefined)
      body["corrections"] = input.corrections;
    const res = await ctx.fetch(url.toString(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await ensureAlgoliaOk(res, "saveSynonym");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
