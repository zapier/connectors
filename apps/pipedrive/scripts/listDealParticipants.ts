#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    id: z.number().int().describe("Deal id."),
    start: z
      .number()
      .int()
      .describe("Pagination offset (v1 offset pagination).")
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(500)
      .describe(
        "Maximum number of participants to return. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int().describe("Participant id."),
      person_id: z.number().int().describe("Participating person id."),
      name: z.string().describe("Participant name.").nullish(),
    }),
  ),
  next_start: z
    .union([
      z.number().int().describe("Offset for the next page; null when none."),
      z.null().describe("Offset for the next page; null when none."),
    ])
    .describe("Offset for the next page; null when none.")
    .nullish(),
});

const definition = defineTool({
  name: "listDealParticipants",
  title: "List Deal Participants",
  description:
    "List the persons participating in a deal (distinct from the deal's single linked person_id).",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "pipedrive",
  run: async (input, ctx) => {
    const url = new URL(
      `https://api.pipedrive.com/v1/deals/${encodeURIComponent(input.id)}/participants`,
    );
    if (input.start !== undefined) {
      url.searchParams.set("start", String(input.start));
    }
    url.searchParams.set("limit", String(input.limit ?? 20));
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    const wire = await readPipedrive("listDealParticipants", res);
    const additional = wire.additional_data as
      | { pagination?: { next_start?: number | null } }
      | undefined;
    return {
      items: wire.data,
      next_start: additional?.pagination?.next_start ?? null,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
