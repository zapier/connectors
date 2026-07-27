#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { resendFetch } from "../lib/resendFetch.ts";

const inputSchema = z
  .object({ id: z.string().describe("Contact id or email address.") })
  .strict();
const outputSchema = z.object({
  object: z.literal("contact"),
  contact: z
    .string()
    .nullable()
    .describe("The deleted contact's id.")
    .optional(),
  deleted: z.boolean(),
});

const definition = defineTool({
  name: "deleteContact",
  title: "Delete Contact",
  description:
    "Delete a contact from the account, by contact id OR email address. Irreversible.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "resend",
  run: async (input, ctx) => {
    const res = await resendFetch(
      ctx.fetch,
      `/contacts/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
      "Resend deleteContact",
    );
    return res.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
