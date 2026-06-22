#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    status: z
      .enum(["open", "won", "lost", "deleted"])
      .describe("Filter by deal status.")
      .optional(),
    pipeline_id: z
      .number()
      .int()
      .describe("Filter to a pipeline. From listPipelines.")
      .optional(),
    stage_id: z
      .number()
      .int()
      .describe("Filter to a stage. From listStages.")
      .optional(),
    person_id: z
      .number()
      .int()
      .describe("Deals belonging to a person. From searchPersons.")
      .optional(),
    org_id: z
      .number()
      .int()
      .describe("Deals belonging to an organization. From searchOrganizations.")
      .optional(),
    owner_id: z
      .number()
      .int()
      .describe("Filter to an owning user. From listUsers.")
      .optional(),
    filter_id: z
      .number()
      .int()
      .describe("A saved filter id, if the user already has one.")
      .optional(),
    sort_by: z
      .enum(["id", "add_time", "update_time"])
      .describe("Sort field.")
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(500)
      .describe(
        "Maximum number of deals to return. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    cursor: z
      .string()
      .describe("Pagination cursor from a previous response's next_cursor.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int().describe("Deal id."),
      title: z.string().describe("Deal title."),
      value: z.number().describe("Monetary value.").nullish(),
      currency: z.string().describe("3-letter ISO currency code.").nullish(),
      status: z.string().describe("open, won, or lost.").nullish(),
      pipeline_id: z
        .number()
        .int()
        .describe("Pipeline this deal is in.")
        .nullish(),
      stage_id: z
        .number()
        .int()
        .describe("Stage within the pipeline.")
        .nullish(),
      person_id: z
        .union([
          z.number().int().describe("Linked person id."),
          z.null().describe("Linked person id."),
        ])
        .describe("Linked person id.")
        .nullish(),
      org_id: z
        .union([
          z.number().int().describe("Linked organization id."),
          z.null().describe("Linked organization id."),
        ])
        .describe("Linked organization id.")
        .nullish(),
      owner_id: z.number().int().describe("Owning user id.").nullish(),
      expected_close_date: z
        .union([
          z.string().date().describe("Expected close date, YYYY-MM-DD."),
          z.null().describe("Expected close date, YYYY-MM-DD."),
        ])
        .describe("Expected close date, YYYY-MM-DD.")
        .nullish(),
      probability: z
        .union([
          z.number().describe("Win probability 0-100."),
          z.null().describe("Win probability 0-100."),
        ])
        .describe("Win probability 0-100.")
        .nullish(),
      label_ids: z
        .array(z.number().int())
        .describe("Deal label ids.")
        .nullish(),
      add_time: z
        .string()
        .datetime({ offset: true })
        .describe("Creation time, RFC 3339."),
      update_time: z
        .string()
        .datetime({ offset: true })
        .describe("Last update time, RFC 3339.")
        .nullish(),
      custom_fields: z
        .record(z.string(), z.json())
        .describe(
          "Account custom fields keyed by 40-char field hash. Discover keys and option ids via listDealFields.",
        )
        .nullish(),
    }),
  ),
  next_cursor: z
    .union([
      z
        .string()
        .describe("Cursor for the next page; null when there are no more."),
      z
        .null()
        .describe("Cursor for the next page; null when there are no more."),
    ])
    .describe("Cursor for the next page; null when there are no more.")
    .nullish(),
});

const definition = defineTool({
  name: "listDeals",
  title: "List Deals",
  description:
    "List deals, filterable by status, pipeline, stage, owner, person, or organization. Use person_id/org_id to list a contact's deals.",
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
    const url = new URL(`https://api.pipedrive.com/api/v2/deals`);
    if (input.status !== undefined) {
      url.searchParams.set("status", String(input.status));
    }
    if (input.pipeline_id !== undefined) {
      url.searchParams.set("pipeline_id", String(input.pipeline_id));
    }
    if (input.stage_id !== undefined) {
      url.searchParams.set("stage_id", String(input.stage_id));
    }
    if (input.person_id !== undefined) {
      url.searchParams.set("person_id", String(input.person_id));
    }
    if (input.org_id !== undefined) {
      url.searchParams.set("org_id", String(input.org_id));
    }
    if (input.owner_id !== undefined) {
      url.searchParams.set("owner_id", String(input.owner_id));
    }
    if (input.filter_id !== undefined) {
      url.searchParams.set("filter_id", String(input.filter_id));
    }
    if (input.sort_by !== undefined) {
      url.searchParams.set("sort_by", String(input.sort_by));
    }
    url.searchParams.set("limit", String(input.limit ?? 20));
    if (input.cursor !== undefined) {
      url.searchParams.set("cursor", String(input.cursor));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    const wire = await readPipedrive("listDeals", res);
    const additional = wire.additional_data as
      | { next_cursor?: string | null }
      | undefined;
    return {
      items: wire.data,
      next_cursor: additional?.next_cursor ?? null,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
