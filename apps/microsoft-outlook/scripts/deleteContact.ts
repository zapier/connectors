#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { GRAPH_BASE, outlookFetch } from "../lib/graph.ts";

const inputSchema = z
  .object({
    contactId: z
      .string()
      .describe("Contact id from listContacts. Opaque and case-sensitive."),
  })
  .strict();

// Graph's DELETE /me/contacts/{id} returns 204 with no body, so there is
// nothing to echo back — run() synthesizes a success result.
const outputSchema = z.object({
  success: z.literal(true),
});

const definition = defineTool({
  name: "deleteContact",
  title: "Delete Contact",
  description:
    "Delete a personal contact by id. This cannot be undone — resolve the id via listContacts and confirm it's the right contact first.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-outlook",
  run: async (input, ctx) => {
    const url = `${GRAPH_BASE}/me/contacts/${encodeURIComponent(
      input.contactId,
    )}`;
    await outlookFetch(ctx.fetch, "deleteContact", url, { method: "DELETE" });
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
