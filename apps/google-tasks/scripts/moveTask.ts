#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwForGoogleTasks } from "../lib/google-tasks.ts";

const inputSchema = z
  .object({
    tasklist: z.string().describe("Task-list id (resolve via listTaskLists)."),
    task: z.string().describe("Task id from listTasks or getTask."),
    parent: z
      .string()
      .describe(
        "New parent task id (subtasks nest one level deep). Omit to move to the top level. Assigned/repeating tasks and completed-hidden tasks cannot be parents.",
      )
      .optional(),
    previous: z
      .string()
      .describe(
        "New previous-sibling task id. Omit to move to the first position.",
      )
      .optional(),
    destinationTasklist: z
      .string()
      .describe(
        "Task-list id to move the task into (from listTaskLists). Omit to reorder within the current list. Recurring tasks cannot move between lists.",
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
  name: "moveTask",
  title: "Move Task",
  description:
    "Reposition, reparent, or move a task to another list. Set parent to nest it, previous to order it among siblings, destinationTasklist to move it to another list.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-tasks",
  run: async (input, ctx) => {
    const url = new URL(
      `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(input.tasklist)}/tasks/${encodeURIComponent(input.task)}/move`,
    );
    if (input.parent !== undefined) {
      url.searchParams.set("parent", String(input.parent));
    }
    if (input.previous !== undefined) {
      url.searchParams.set("previous", String(input.previous));
    }
    if (input.destinationTasklist !== undefined) {
      url.searchParams.set(
        "destinationTasklist",
        String(input.destinationTasklist),
      );
    }
    const res = await ctx.fetch(url.toString(), {
      method: "POST",
    });
    await throwForGoogleTasks(res, "moveTask");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
