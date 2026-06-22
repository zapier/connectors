#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    owner_id: z
      .number()
      .int()
      .describe("Filter to an owning user. From listUsers.")
      .optional(),
    filter_id: z.number().int().describe("A saved filter id.").optional(),
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
        "Maximum number of organizations to return. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    cursor: z.string().describe("Pagination cursor.").optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int().describe("Organization id."),
      name: z.string().describe("Organization name."),
      owner_id: z.number().int().describe("Owning user id.").nullish(),
      label_ids: z
        .array(z.number().int())
        .describe("Organization label ids.")
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
          "Account custom fields keyed by 40-char field hash. Discover keys and option ids via listOrganizationFields.",
        )
        .nullish(),
    }),
  ),
  next_cursor: z
    .union([
      z.string().describe("Cursor for the next page; null when none."),
      z.null().describe("Cursor for the next page; null when none."),
    ])
    .describe("Cursor for the next page; null when none.")
    .nullish(),
});

const definition = defineTool({
  name: "listOrganizations",
  title: "List Organizations",
  description: "List organizations, filterable by owner.",
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
    const url = new URL(`https://api.pipedrive.com/api/v2/organizations`);
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
    const wire = await readPipedrive("listOrganizations", res);
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
