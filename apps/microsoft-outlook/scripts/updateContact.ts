#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { GRAPH_BASE, outlookFetch } from "../lib/graph.ts";
import { contactSchema, outgoingContactSchema } from "../lib/schemas.ts";

const inputSchema = z
  .object({
    contactId: z
      .string()
      .describe("Contact id from listContacts. Opaque and case-sensitive."),
    ...outgoingContactSchema.shape,
  })
  .strict();

const outputSchema = contactSchema;

const definition = defineTool({
  name: "updateContact",
  title: "Update Contact",
  description:
    "Update fields on a personal contact. Set only the fields you want to change. Array fields (emailAddresses, businessPhones) REPLACE the existing values — read current via getContact, merge, then update.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-outlook",
  run: async (input, ctx) => {
    const { contactId, ...patch } = input;
    const url = `${GRAPH_BASE}/me/contacts/${encodeURIComponent(contactId)}`;
    // undefined keys are dropped by JSON.stringify, so only supplied fields
    // are sent in the PATCH body.
    const res = await outlookFetch(ctx.fetch, "updateContact", url, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
