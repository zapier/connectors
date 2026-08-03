#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ensureAlgoliaOk } from "../lib/algolia.ts";

const inputSchema = z
  .object({
    indexName: z
      .string()
      .describe("Index to add the rule to. From listIndices."),
    objectID: z.string().describe("Rule id (create new or replace existing)."),
    conditions: z
      .array(z.record(z.string(), z.any()))
      .describe(
        "When the rule fires; each { pattern?, anchoring?, context?, filters? }. anchoring: is/startsWith/endsWith/contains.",
      )
      .optional(),
    consequence: z
      .record(z.string(), z.any())
      .describe(
        "What the rule does: { params?, promote?, hide?, filterPromotes? } — boost/bury/pin records or inject filters.",
      ),
    description: z
      .string()
      .describe("Human-readable rule description.")
      .optional(),
    enabled: z
      .boolean()
      .describe("Whether the rule is active (default true).")
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
  updatedAt: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "saveRule",
  title: "Save Rule",
  description:
    "Create or replace a single query rule (condition -> consequence that reshapes results). Conditionless rules omit conditions. The condition/consequence shape is intricate.",
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
      `https://application-id.algolia.net/1/indexes/${encodeURIComponent(input.indexName)}/rules/${encodeURIComponent(input.objectID)}`,
    );
    if (input.forwardToReplicas !== undefined) {
      url.searchParams.set(
        "forwardToReplicas",
        String(input.forwardToReplicas),
      );
    }
    // Algolia's rules API requires objectID in the request body (matching the
    // path segment), not just the path — unlike saveSynonym. Omitting it 400s
    // with "Missing mandatory attribute `objectID`".
    const body: Record<string, unknown> = { objectID: input.objectID };
    if (input.conditions !== undefined) body["conditions"] = input.conditions;
    if (input.consequence !== undefined)
      body["consequence"] = input.consequence;
    if (input.description !== undefined)
      body["description"] = input.description;
    if (input.enabled !== undefined) body["enabled"] = input.enabled;
    const res = await ctx.fetch(url.toString(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await ensureAlgoliaOk(res, "saveRule");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
