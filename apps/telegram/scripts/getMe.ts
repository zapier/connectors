#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  TELEGRAM_API,
  throwTelegramError,
  userSchema,
} from "../lib/telegram.ts";

const inputSchema = z.object({}).strict();

const definition = defineTool({
  name: "getMe",
  title: "Get Me",
  description:
    "Get the bot's own identity and verify the token is valid. Returns the bot User.",
  inputSchema,
  outputSchema: userSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "telegram",
  run: async (_input, ctx) => {
    const url = `${TELEGRAM_API}/getMe`;
    const res = await ctx.fetch(url, {
      method: "POST",
    });
    if (!res.ok) await throwTelegramError("getMe", res);
    const { result } = (await res.json()) as { result: unknown };
    return result;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
