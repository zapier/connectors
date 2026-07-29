#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  dateTimeTimeZoneSchema,
  GRAPH_BASE,
  listPathSegment,
  taskSchema,
  todoFetch,
} from "../lib/microsoft-todo.ts";

const inputSchema = z
  .object({
    listId: z
      .string()
      .describe(
        'Task-list id from listLists. Omit to create the task in your default list (the built-in "Tasks" list).',
      )
      .optional(),
    title: z.string().describe("Title of the task."),
    body: z
      .object({
        content: z.string().describe("The note text.").optional(),
        contentType: z
          .enum(["text", "html"])
          .describe("text (default, recommended) or html.")
          .optional(),
      })
      .strict()
      .describe("A task's note/body. contentType is text or html.")
      .optional(),
    importance: z
      .enum(["low", "normal", "high"])
      .describe("Task importance. Defaults to normal.")
      .optional(),
    status: z
      .enum([
        "notStarted",
        "inProgress",
        "completed",
        "waitingOnOthers",
        "deferred",
      ])
      .describe("Set to completed to mark done; set to notStarted to reopen.")
      .optional(),
    isReminderOn: z
      .boolean()
      .describe("Whether a reminder is enabled. Set with reminderDateTime.")
      .optional(),
    dueDateTime: dateTimeTimeZoneSchema
      .strict()
      .describe(
        "A date/time with its time zone. dateTime is a naive local timestamp with no trailing Z or offset; timeZone names the zone. Always set both fields — the time-of-day portion may not round-trip exactly as sent (a documented Graph quirk), so read the value back after creating to confirm.",
      )
      .optional(),
    reminderDateTime: dateTimeTimeZoneSchema
      .strict()
      .describe(
        "A date/time with its time zone. dateTime is a naive local timestamp with no trailing Z or offset; timeZone names the zone.",
      )
      .optional(),
    startDateTime: dateTimeTimeZoneSchema
      .strict()
      .describe(
        "A date/time with its time zone. dateTime is a naive local timestamp with no trailing Z or offset; timeZone names the zone.",
      )
      .optional(),
    categories: z
      .array(z.string())
      .describe(
        "Category names applied to the task (each must match an Outlook category name).",
      )
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "createTask",
  title: "Create Task",
  description:
    "Create a task in a list. Set status to completed to create it already done; attach steps afterward with createChecklistItem.",
  inputSchema,
  outputSchema: taskSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "microsoft-todo",
  run: async (input, ctx) => {
    const url = `${GRAPH_BASE}/me/todo/lists/${listPathSegment(input.listId)}/tasks`;
    const body: Record<string, unknown> = { title: input.title };
    if (input.body !== undefined) body["body"] = input.body;
    if (input.importance !== undefined) body["importance"] = input.importance;
    if (input.status !== undefined) body["status"] = input.status;
    if (input.isReminderOn !== undefined)
      body["isReminderOn"] = input.isReminderOn;
    if (input.dueDateTime !== undefined)
      body["dueDateTime"] = input.dueDateTime;
    if (input.reminderDateTime !== undefined)
      body["reminderDateTime"] = input.reminderDateTime;
    if (input.startDateTime !== undefined)
      body["startDateTime"] = input.startDateTime;
    if (input.categories !== undefined) body["categories"] = input.categories;
    const res = await todoFetch(ctx.fetch, "createTask", url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
