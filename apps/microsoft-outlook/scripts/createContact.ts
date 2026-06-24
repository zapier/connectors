#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { GRAPH_BASE, outlookFetch, parseGraphResponse } from "../lib/graph.ts";
import { contactSchema, outgoingContactSchema } from "../lib/schemas.ts";

const inputSchema = z.object({ ...outgoingContactSchema.shape }).strict();

const outputSchema = contactSchema;

const definition = defineTool({
  name: "createContact",
  title: "Create Contact",
  description:
    "Create a personal contact. No single field is required, but set at least a name (givenName/surname/displayName) or an email address so the contact is identifiable. Microsoft allows a maximum of 3 email addresses per contact.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "microsoft-outlook",
  run: async (input, ctx) => {
    const url = `${GRAPH_BASE}/me/contacts`;
    const res = await outlookFetch(ctx.fetch, "createContact", url, {
      method: "POST",
      body: JSON.stringify(input),
    });
    return parseGraphResponse(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
