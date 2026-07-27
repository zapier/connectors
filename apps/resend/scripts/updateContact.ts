#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { resendFetch } from "../lib/resendFetch.ts";

const inputSchema = z
  .object({
    id: z.string().describe("Contact id or email address."),
    first_name: z.string().describe("The contact's first name.").optional(),
    last_name: z.string().describe("The contact's last name.").optional(),
    unsubscribed: z.boolean().describe("Global unsubscribe status.").optional(),
    properties: z
      .record(z.string(), z.json())
      .describe(
        "Custom property values to set. Only keys already defined on the account (see listContactProperties) are guaranteed to be recognized. A successful response here does not by itself confirm the value was stored — if the key wasn't already confirmed valid, read the contact back to verify the property persisted before reporting success.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({ object: z.literal("contact"), id: z.string() });

const definition = defineTool({
  name: "updateContact",
  title: "Update Contact",
  description:
    "Update a contact's name, unsubscribe status, or custom properties, by contact id OR email address.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "resend",
  run: async (input, ctx) => {
    const { id, ...body } = input;
    const res = await resendFetch(
      ctx.fetch,
      `/contacts/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(body) },
      "Resend updateContact",
    );
    return res.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
