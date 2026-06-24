#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  PersonSchema,
  throwForGoogleContacts,
} from "../lib/google-contacts.ts";

const inputSchema = z
  .object({
    readMask: z
      .string()
      .describe(
        "Comma-separated fields to return. Other contacts support only emailAddresses, metadata, names, phoneNumbers, and photos.",
      )
      .default("names,emailAddresses,phoneNumbers,metadata"),
    pageSize: z
      .number()
      .int()
      .gte(1)
      .lte(1000)
      .describe(
        "Max other-contacts to return per page. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
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
  name: "listOtherContacts",
  title: "List Other Contacts",
  description:
    'List the user\'s auto-saved "other contacts" — people interacted with (e.g. emailed) but never explicitly saved. Read-only; use copyOtherContact to make one editable.',
  inputSchema,
  outputSchema: z.object({
    otherContacts: z
      .array(PersonSchema)
      .optional()
      .describe("The page of other contacts."),
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
    const url = new URL("https://people.googleapis.com/v1/otherContacts");
    url.searchParams.set("readMask", input.readMask);
    url.searchParams.set("pageSize", String(input.pageSize ?? 20));
    if (input.pageToken !== undefined) {
      url.searchParams.set("pageToken", input.pageToken);
    }
    const res = await ctx.fetch(url.toString(), { method: "GET" });
    await throwForGoogleContacts(res, "listOtherContacts");
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
