#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwForGoogleTasks } from "../lib/google-tasks.ts";

const inputSchema = z
  .object({
    tasklist: z
      .string()
      .describe(
        'Task-list id from listTaskLists, or the literal "@default" for the user\'s primary list.',
      ),
    task: z.string().describe("Task id from listTasks or getTask."),
    title: z.string().max(1024).describe("Title of the task.").optional(),
    notes: z
      .string()
      .max(8192)
      .describe(
        "Free-text notes. Assigned tasks (from Docs/Chat) cannot have notes.",
      )
      .optional(),
    status: z
      .enum(["needsAction", "completed"])
      .describe(
        "Set to completed to mark done (the server stamps the completion time); set to needsAction to reopen (which clears it).",
      )
      .optional(),
    due: z
      .string()
      .datetime({ offset: true })
      .describe(
        "Due date as a full RFC3339 timestamp (e.g. 2026-07-01T00:00:00Z) — a bare date is rejected by the API. The date is recorded and the time is discarded, so pass midnight UTC for the intended day. Just the day shown, not a deadline.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z
  .object({
    id: z.string().nullable().describe("Task id.").optional(),
    title: z.string().nullable().describe("Title of the task.").optional(),
    notes: z.string().nullable().describe("Free-text notes.").optional(),
    status: z
      .enum(["needsAction", "completed"])
      .nullable()
      .describe("needsAction or completed.")
      .optional(),
    due: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .describe(
        "Due date (date-only; time is always midnight UTC). Read only the date portion.",
      )
      .optional(),
    completed: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .describe(
        "Completion time (RFC3339). Server-stamped; absent when the task is not completed. Read-only.",
      )
      .optional(),
    deleted: z
      .boolean()
      .nullable()
      .describe("True if the task has been soft-deleted. Read-only.")
      .optional(),
    hidden: z
      .boolean()
      .nullable()
      .describe(
        "True if the task is hidden (completed-in-app or cleared). Read-only.",
      )
      .optional(),
    parent: z
      .string()
      .nullable()
      .describe(
        "Parent task id when this is a subtask; absent for top-level tasks. Read-only — change via moveTask.",
      )
      .optional(),
    position: z
      .string()
      .nullable()
      .describe(
        "Opaque ordering string (lexicographic), not an index. Read-only — reorder via moveTask.",
      )
      .optional(),
    updated: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .describe("Last-modified time (RFC3339). Read-only.")
      .optional(),
    webViewLink: z
      .string()
      .nullable()
      .describe("Link to the task in the Google Tasks web UI. Read-only.")
      .optional(),
    links: z
      .array(
        z.object({
          type: z.string().nullable().optional(),
          description: z.string().nullable().optional(),
          link: z.string().nullable().optional(),
        }),
      )
      .nullable()
      .describe("Related links (e.g. email, chat). Read-only.")
      .optional(),
  })
  .describe("A task.");

const definition = defineTool({
  name: "updateTask",
  title: "Update Task",
  description:
    "Update a task. Only the fields you send change. Set status to completed to mark done (the server stamps the completion time); set needsAction to reopen. To reorder or reparent, use moveTask.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-tasks",
  run: async (input, ctx) => {
    const url = `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(input.tasklist)}/tasks/${encodeURIComponent(input.task)}`;
    const body: Record<string, unknown> = {};
    if (input.title !== undefined) body["title"] = input.title;
    if (input.notes !== undefined) body["notes"] = input.notes;
    if (input.status !== undefined) body["status"] = input.status;
    if (input.due !== undefined) body["due"] = input.due;
    const res = await ctx.fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwForGoogleTasks(res, "updateTask");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
