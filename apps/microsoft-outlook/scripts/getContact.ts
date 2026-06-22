#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { GRAPH_BASE, outlookFetch } from "../lib/graph.ts";
import { contactSchema } from "../lib/schemas.ts";

const inputSchema = z
  .object({
    contactId: z
      .string()
      .describe("Contact id from listContacts. Opaque and case-sensitive."),
  })
  .strict();

const outputSchema = contactSchema;

const definition = defineTool({
  name: "getContact",
  title: "Get Contact",
  description:
    "Retrieve a single personal contact by id, including names, company, email addresses, and phone numbers. Resolve the id via listContacts first. The resolver getter for updateContact.",
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
    const url = `${GRAPH_BASE}/me/contacts/${encodeURIComponent(
      input.contactId,
    )}`;
    const res = await outlookFetch(ctx.fetch, "getContact", url);
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
