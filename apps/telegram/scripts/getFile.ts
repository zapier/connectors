#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readTelegram, TELEGRAM_API } from "../lib/telegram.ts";

const inputSchema = z
  .object({
    file_id: z
      .string()
      .describe(
        "file_id of the file, from a message's photo/document/video/audio.",
      ),
  })
  .strict();
const outputSchema = z
  .object({
    file_id: z
      .string()
      .describe("Identifier for this file, reusable in send methods."),
    file_unique_id: z
      .string()
      .describe(
        "Stable unique identifier for the file (not reusable for download).",
      ),
    file_size: z
      .number()
      .int()
      .describe("File size in bytes, if known.")
      .optional(),
    file_path: z
      .string()
      .describe(
        "Relative path on Telegram's servers. Download the file at https://api.telegram.org/file/bot<token>/<file_path> using your bot token (valid ~1 hour).",
      )
      .optional(),
  })
  .describe("A file ready for download.");

const definition = defineTool({
  name: "getFile",
  title: "Get File",
  description:
    "Get a file's metadata and file_path for a file_id (e.g. from a received or sent message). Download it at https://api.telegram.org/file/bot<token>/<file_path> with your bot token; the path is valid ~1 hour.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "telegram",
  run: async (input, ctx) => {
    const url = `${TELEGRAM_API}/getFile`;
    const body: Record<string, unknown> = {};
    if (input.file_id !== undefined) body["file_id"] = input.file_id;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readTelegram("getFile", res);
    return data.result;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
