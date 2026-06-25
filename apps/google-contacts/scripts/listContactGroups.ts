#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  ContactGroupSchema,
  DEFAULT_GROUP_FIELDS,
  throwForGoogleContacts,
} from "../lib/google-contacts.ts";

const inputSchema = z
  .object({
    groupFields: z
      .string()
      .describe(
        "Comma-separated list of contact-group fields to return (e.g. name,groupType,memberCount).",
      )
      .default(DEFAULT_GROUP_FIELDS),
    pageSize: z
      .number()
      .int()
      .gte(1)
      .lte(1000)
      .describe(
        "Max groups to return per page. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    pageToken: z
      .string()
      .describe(
        "Page cursor from a previous response's next_page_token. Omit for the first page.",
      )
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "listContactGroups",
  title: "List Contact Groups",
  description:
    "List the account's contact groups (labels), user and system, with id, name, type, and member count. The resolver for any contactGroupResourceName.",
  inputSchema,
  outputSchema: z.object({
    contactGroups: z
      .array(ContactGroupSchema)
      .optional()
      .describe("The page of contact groups."),
    next_page_token: z
      .string()
      .optional()
      .describe("Cursor for the next page; absent when there are no more."),
  }),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-contacts",
  run: async (input, ctx) => {
    const url = new URL("https://people.googleapis.com/v1/contactGroups");
    url.searchParams.set("groupFields", input.groupFields);
    url.searchParams.set("pageSize", String(input.pageSize ?? 20));
    if (input.pageToken !== undefined) {
      url.searchParams.set("pageToken", input.pageToken);
    }
    const res = await ctx.fetch(url.toString(), { method: "GET" });
    await throwForGoogleContacts(res, "listContactGroups");
    const payload = (await res.json()) as Record<string, unknown>;
    if (payload && typeof payload === "object" && "nextPageToken" in payload) {
      payload.next_page_token = payload.nextPageToken;
      delete payload.nextPageToken;
    }
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
