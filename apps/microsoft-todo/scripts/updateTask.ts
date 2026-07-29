#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  dateTimeTimeZoneSchema,
  GRAPH_BASE,
  taskSchema,
  todoFetch,
} from "../lib/microsoft-todo.ts";

const inputSchema = z
  .object({
    listId: z
      .string()
      .describe(
        "Task-list id from listLists. Required here — this connector always resolves a real listId for single-item and checklist operations rather than relying on the Tasks alias, whose support outside the collection endpoints (createTask/listTasks/findTask) is unconfirmed.",
      ),
    taskId: z
      .string()
      .describe(
        "Task id from listTasks, findTask, or getTask. Note the id changes if the task is moved to another list.",
      ),
    title: z.string().describe("Title of the task.").optional(),
    body: z
      .object({
        content: z.string().describe("The note text.").optional(),
        contentType: z
          .enum(["text", "html"])
          .describe(
            "text or html. On update specifically, Microsoft documents only html as supported — if a plain-text body update doesn't seem to take effect, send it as html instead.",
          )
          .optional(),
      })
      .strict()
      .describe("A task's note/body. contentType is text or html.")
      .optional(),
    importance: z
      .enum(["low", "normal", "high"])
      .describe("Task importance.")
      .optional(),
    status: z
      .enum([
        "notStarted",
        "inProgress",
        "completed",
        "waitingOnOthers",
        "deferred",
      ])
      .describe(
        "Set to completed to mark done; set to notStarted to reopen. completeTask is a shorthand for the completed case.",
      )
      .optional(),
    isReminderOn: z
      .boolean()
      .describe("Whether a reminder is enabled. Set with reminderDateTime.")
      .optional(),
    dueDateTime: dateTimeTimeZoneSchema
      .strict()
      .describe(
        "A date/time with its time zone. dateTime is a naive local timestamp with no trailing Z or offset; timeZone names the zone. Always set both fields — the time-of-day portion may not round-trip exactly as sent (a documented Graph quirk), so read the value back after updating to confirm.",
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
  name: "updateTask",
  title: "Update Task",
  description:
    "Update a task. Only sent fields change. Set status to completed to mark done or notStarted to reopen.",
  inputSchema,
  outputSchema: taskSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-todo",
  run: async (input, ctx) => {
    const url = `${GRAPH_BASE}/me/todo/lists/${encodeURIComponent(input.listId)}/tasks/${encodeURIComponent(input.taskId)}`;
    const body: Record<string, unknown> = {};
    if (input.title !== undefined) body["title"] = input.title;
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
    const res = await todoFetch(ctx.fetch, "updateTask", url, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
