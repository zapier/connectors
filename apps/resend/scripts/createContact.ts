#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { resendFetch } from "../lib/resendFetch.ts";

const inputSchema = z
  .object({
    email: z.string().describe("The contact's email address."),
    first_name: z.string().describe("The contact's first name.").optional(),
    last_name: z.string().describe("The contact's last name.").optional(),
    unsubscribed: z
      .boolean()
      .describe(
        "Global unsubscribe status; true unsubscribes from all broadcasts.",
      )
      .optional(),
    properties: z
      .record(z.string(), z.json())
      .describe(
        "Custom property values keyed by property key. Discover valid keys via listContactProperties.",
      )
      .optional(),
    segments: z
      .array(z.object({ id: z.string() }).strict())
      .describe(
        "Segment ids to add the contact to on creation. Resolve via listSegments.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  object: z.literal("contact"),
  id: z.string().describe("The new contact's id."),
});

const definition = defineTool({
  name: "createContact",
  title: "Create Contact",
  description:
    "Create a contact in the account's contact list. Only email is required. Discover valid `properties` keys via listContactProperties.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "resend",
  run: async (input, ctx) => {
    const res = await resendFetch(
      ctx.fetch,
      "/contacts",
      { method: "POST", body: JSON.stringify(input) },
      "Resend createContact",
    );
    return res.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
