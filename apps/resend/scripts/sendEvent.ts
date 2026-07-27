#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { resendFetch } from "../lib/resendFetch.ts";

const inputSchema = z
  .object({
    event: z
      .string()
      .describe(
        "The event name to trigger, e.g. user.created. Must match an automation trigger step's configured event name.",
      ),
    contact_id: z
      .string()
      .describe(
        "The contact id to associate with the event. Provide exactly one of contact_id or email.",
      )
      .optional(),
    email: z
      .string()
      .describe(
        "The contact email to associate with the event. Provide exactly one of contact_id or email.",
      )
      .optional(),
    payload: z
      .record(z.string(), z.json())
      .describe("Optional custom data passed to the automation.")
      .optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    const provided = [val.contact_id, val.email].filter(
      (v) => v !== undefined,
    ).length;
    if (provided !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Provide exactly one of contact_id or email.",
      });
    }
  });
const outputSchema = z.object({
  object: z.literal("event"),
  event: z.string().describe("The event name that was triggered."),
});

const definition = defineTool({
  name: "sendEvent",
  title: "Send Event",
  description:
    "Trigger an automation by sending a named event for a contact. The event name must match an automation trigger configured in the Resend dashboard.",
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
      "/events/send",
      { method: "POST", body: JSON.stringify(input) },
      "Resend sendEvent",
    );
    return res.json() as Promise<z.infer<typeof outputSchema>>;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
