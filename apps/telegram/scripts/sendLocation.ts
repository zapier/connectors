#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { messageSchema, readTelegram, TELEGRAM_API } from "../lib/telegram.ts";

const inputSchema = z
  .object({
    chat_id: z
      .string()
      .describe(
        "Target chat — numeric id or @username. The bot must be a member.",
      ),
    latitude: z.number().describe("Latitude of the location."),
    longitude: z.number().describe("Longitude of the location."),
    horizontal_accuracy: z
      .number()
      .describe("Radius of uncertainty for the location, in meters (0–1500).")
      .optional(),
    disable_notification: z
      .boolean()
      .describe("Send silently. Default false.")
      .optional(),
    protect_content: z
      .boolean()
      .describe("Protect from forwarding and saving. Default false.")
      .optional(),
    message_thread_id: z
      .number()
      .int()
      .describe("Target a forum-supergroup topic.")
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "sendLocation",
  title: "Send Location",
  description: "Send a point on the map to a chat.",
  inputSchema,
  outputSchema: messageSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "telegram",
  run: async (input, ctx) => {
    const url = `${TELEGRAM_API}/sendLocation`;
    const body: Record<string, unknown> = {};
    if (input.chat_id !== undefined) body["chat_id"] = input.chat_id;
    if (input.latitude !== undefined) body["latitude"] = input.latitude;
    if (input.longitude !== undefined) body["longitude"] = input.longitude;
    if (input.horizontal_accuracy !== undefined)
      body["horizontal_accuracy"] = input.horizontal_accuracy;
    if (input.disable_notification !== undefined)
      body["disable_notification"] = input.disable_notification;
    if (input.protect_content !== undefined)
      body["protect_content"] = input.protect_content;
    if (input.message_thread_id !== undefined)
      body["message_thread_id"] = input.message_thread_id;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readTelegram("sendLocation", res);
    return data.result;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
