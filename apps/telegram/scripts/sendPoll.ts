#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  messageSchema,
  TELEGRAM_API,
  throwTelegramError,
} from "../lib/telegram.ts";

const inputSchema = z
  .object({
    chat_id: z
      .string()
      .describe(
        "Target chat — numeric id or @username. The bot must be a member.",
      ),
    question: z.string().describe("Poll question, 1–300 characters."),
    options: z
      .array(z.string())
      .describe("Answer options, 2–12 items, each 1–100 characters."),
    type: z
      .enum(["regular", "quiz"])
      .describe("Poll type. Default regular. A quiz has one correct answer.")
      .optional(),
    is_anonymous: z
      .boolean()
      .describe("Whether votes are anonymous. Default true.")
      .optional(),
    allows_multiple_answers: z
      .boolean()
      .describe("Allow multiple answers (regular polls only). Default false.")
      .optional(),
    correct_option_id: z
      .number()
      .int()
      .describe(
        "0-based index of the correct option. Required when type=quiz; ignored otherwise.",
      )
      .optional(),
    explanation: z
      .string()
      .describe(
        "Text shown when a user picks a wrong quiz answer, 0–200 characters (quiz only).",
      )
      .optional(),
    explanation_parse_mode: z
      .enum(["HTML", "MarkdownV2", "Markdown"])
      .describe("Formatting mode for the explanation.")
      .optional(),
    open_period: z
      .number()
      .int()
      .describe("Seconds the poll stays open after creation, 5–600.")
      .optional(),
    is_closed: z
      .boolean()
      .describe(
        "Send the poll already closed (e.g. for a preview). Default false.",
      )
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
  .strict()
  .superRefine((val, ctx) => {
    if (val.type === "quiz" && val.correct_option_id === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "correct_option_id is required when type is 'quiz'.",
        path: ["correct_option_id"],
      });
    }
  });

const definition = defineTool({
  name: "sendPoll",
  title: "Send Poll",
  description:
    "Send a poll or quiz to a chat. For a quiz set type=quiz and correct_option_id.",
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
    const url = `${TELEGRAM_API}/sendPoll`;
    const body: Record<string, unknown> = {};
    if (input.chat_id !== undefined) body["chat_id"] = input.chat_id;
    if (input.question !== undefined) body["question"] = input.question;
    if (input.options !== undefined) body["options"] = input.options;
    if (input.type !== undefined) body["type"] = input.type;
    if (input.is_anonymous !== undefined)
      body["is_anonymous"] = input.is_anonymous;
    if (input.allows_multiple_answers !== undefined)
      body["allows_multiple_answers"] = input.allows_multiple_answers;
    if (input.correct_option_id !== undefined)
      body["correct_option_id"] = input.correct_option_id;
    if (input.explanation !== undefined)
      body["explanation"] = input.explanation;
    if (input.explanation_parse_mode !== undefined)
      body["explanation_parse_mode"] = input.explanation_parse_mode;
    if (input.open_period !== undefined)
      body["open_period"] = input.open_period;
    if (input.is_closed !== undefined) body["is_closed"] = input.is_closed;
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
    if (!res.ok) await throwTelegramError("sendPoll", res);
    const { result } = (await res.json()) as { result: unknown };
    return result;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
