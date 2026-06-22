#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({
    deal_id: z
      .number()
      .int()
      .describe("Activities on a deal. From searchDeals or listDeals.")
      .optional(),
    person_id: z
      .number()
      .int()
      .describe("Activities on a person. From searchPersons.")
      .optional(),
    org_id: z
      .number()
      .int()
      .describe("Activities on an organization.")
      .optional(),
    lead_id: z
      .string()
      .uuid()
      .describe("Activities on a lead (UUID).")
      .optional(),
    owner_id: z
      .number()
      .int()
      .describe("Activities assigned to a user. From listUsers.")
      .optional(),
    done: z.boolean().describe("Filter by completion state.").optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(500)
      .describe(
        "Maximum number of activities to return. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    cursor: z.string().describe("Pagination cursor.").optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int().describe("Activity id."),
      subject: z.string().describe("Activity subject."),
      type: z
        .string()
        .describe("Activity type key (from listActivityTypes).")
        .nullish(),
      due_date: z
        .union([
          z.string().date().describe("Due date, YYYY-MM-DD."),
          z.null().describe("Due date, YYYY-MM-DD."),
        ])
        .describe("Due date, YYYY-MM-DD.")
        .nullish(),
      due_time: z
        .union([
          z.string().describe("Due time, 24h HH:MM."),
          z.null().describe("Due time, 24h HH:MM."),
        ])
        .describe("Due time, 24h HH:MM.")
        .nullish(),
      duration: z
        .union([
          z.string().describe("Duration, HH:MM."),
          z.null().describe("Duration, HH:MM."),
        ])
        .describe("Duration, HH:MM.")
        .nullish(),
      deal_id: z
        .union([
          z.number().int().describe("Linked deal id."),
          z.null().describe("Linked deal id."),
        ])
        .describe("Linked deal id.")
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
      owner_id: z.number().int().describe("Assigned user id.").nullish(),
      done: z.boolean().describe("Whether the activity is complete.").nullish(),
      note: z
        .union([
          z.string().describe("Free-text note (HTML allowed)."),
          z.null().describe("Free-text note (HTML allowed)."),
        ])
        .describe("Free-text note (HTML allowed).")
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
  name: "listActivities",
  title: "List Activities",
  description:
    "List activities, filterable by deal, person, organization, owner, or done state. Use deal_id/person_id to list a record's activities.",
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
    const url = new URL(`https://api.pipedrive.com/api/v2/activities`);
    if (input.deal_id !== undefined) {
      url.searchParams.set("deal_id", String(input.deal_id));
    }
    if (input.person_id !== undefined) {
      url.searchParams.set("person_id", String(input.person_id));
    }
    if (input.org_id !== undefined) {
      url.searchParams.set("org_id", String(input.org_id));
    }
    if (input.lead_id !== undefined) {
      url.searchParams.set("lead_id", String(input.lead_id));
    }
    if (input.owner_id !== undefined) {
      url.searchParams.set("owner_id", String(input.owner_id));
    }
    if (input.done !== undefined) {
      url.searchParams.set("done", String(input.done));
    }
    url.searchParams.set("limit", String(input.limit ?? 20));
    if (input.cursor !== undefined) {
      url.searchParams.set("cursor", String(input.cursor));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    const wire = await readPipedrive("listActivities", res);
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
