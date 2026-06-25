#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  buildListQuery,
  GRAPH_BASE,
  outlookFetch,
  toListResult,
} from "../lib/graph.ts";
import { contactSchema } from "../lib/schemas.ts";

const inputSchema = z
  .object({
    filter: z
      .string()
      .describe(
        "OData $filter predicate. Only the email-match form is supported server-side, e.g. \"emailAddresses/any(a:a/address eq 'jane@contoso.com')\". Name search is NOT filterable — list and filter the returned results client-side instead. Omit to list all contacts.",
      )
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Contacts per page. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    cursor: z
      .string()
      .describe(
        "Pagination cursor from a previous response's next_cursor. Omit for the first page.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  items: z.array(contactSchema),
  next_cursor: z
    .string()
    .describe("Pass as cursor to fetch the next page. Absent on the last page.")
    .optional(),
});

const definition = defineTool({
  name: "listContacts",
  title: "List Contacts",
  description:
    "List or search the user's personal contacts. Use filter to match by email, e.g. \"emailAddresses/any(a:a/address eq 'jane@contoso.com')\"; name search isn't filterable server-side, so list and match the returned results yourself. The entry point for resolving a contact id before getContact/updateContact/deleteContact.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-outlook",
  run: async (input, ctx) => {
    // `@odata.nextLink` is an opaque full URL — when paging, fetch it verbatim
    // and skip rebuilding the path/query.
    let url: string;
    if (input.cursor !== undefined) {
      url = input.cursor;
    } else {
      const query = buildListQuery({
        limit: input.limit ?? 20,
        filter: input.filter,
      });
      url = `${GRAPH_BASE}/me/contacts${query}`;
    }
    const res = await outlookFetch(ctx.fetch, "listContacts", url);
    return toListResult(await res.json());
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
