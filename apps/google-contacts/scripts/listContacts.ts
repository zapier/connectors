#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  DEFAULT_PERSON_FIELDS,
  PersonSchema,
  throwForGoogleContacts,
} from "../lib/google-contacts.ts";

const inputSchema = z
  .object({
    personFields: z
      .string()
      .describe(
        "Comma-separated list of contact fields to return (e.g. names,emailAddresses,phoneNumbers). Defaults to a comprehensive set; narrow it to reduce payload. Include metadata for the etag.",
      )
      .default(DEFAULT_PERSON_FIELDS),
    sortOrder: z
      .enum([
        "LAST_MODIFIED_ASCENDING",
        "LAST_MODIFIED_DESCENDING",
        "FIRST_NAME_ASCENDING",
        "LAST_NAME_ASCENDING",
      ])
      .describe("Order of the returned contacts.")
      .optional(),
    pageSize: z
      .number()
      .int()
      .gte(1)
      .lte(1000)
      .describe(
        "Max contacts to return per page. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
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
  name: "listContacts",
  title: "List Contacts",
  description:
    "List the user's contacts, paginated, with full field detail. The primary contact enumerator and resourceName resolver. Use this (not searchContacts) when freshness matters.",
  inputSchema,
  outputSchema: z.object({
    contacts: z
      .array(PersonSchema)
      .optional()
      .describe("The page of contacts."),
    next_page_token: z
      .string()
      .optional()
      .describe("Cursor for the next page; absent when there are no more."),
    total_people: z
      .number()
      .int()
      .optional()
      .describe("Total contacts on the account."),
  }),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-contacts",
  run: async (input, ctx) => {
    const url = new URL(
      "https://people.googleapis.com/v1/people/me/connections",
    );
    url.searchParams.set("personFields", input.personFields);
    if (input.sortOrder !== undefined) {
      url.searchParams.set("sortOrder", input.sortOrder);
    }
    url.searchParams.set("pageSize", String(input.pageSize ?? 20));
    if (input.pageToken !== undefined) {
      url.searchParams.set("pageToken", input.pageToken);
    }
    const res = await ctx.fetch(url.toString(), { method: "GET" });
    await throwForGoogleContacts(res, "listContacts");
    const payload = (await res.json()) as Record<string, unknown>;
    if (payload && typeof payload === "object") {
      if ("connections" in payload) {
        payload.contacts = payload.connections;
        delete payload.connections;
      }
      if ("nextPageToken" in payload) {
        payload.next_page_token = payload.nextPageToken;
        delete payload.nextPageToken;
      }
      if ("totalPeople" in payload) {
        payload.total_people = payload.totalPeople;
        delete payload.totalPeople;
      }
    }
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
