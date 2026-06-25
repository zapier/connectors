#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwForGoogleTasks } from "../lib/google-tasks.ts";

const inputSchema = z
  .object({
    tasklist: z.string().describe("Task-list id (resolve via listTaskLists)."),
    showCompleted: z
      .boolean()
      .describe(
        "Include completed tasks. Defaults to false (active tasks only). Set true to include completed tasks.",
      )
      .default(false),
    showHidden: z
      .boolean()
      .describe(
        "Include hidden tasks (completed-in-app or cleared). Leave unset and it follows showCompleted, so requesting completed tasks returns the complete set; set explicitly to override.",
      )
      .optional(),
    showDeleted: z
      .boolean()
      .describe(
        "Include soft-deleted tasks (status remains, deleted=true). Defaults to false.",
      )
      .default(false),
    showAssigned: z
      .boolean()
      .describe(
        "Include tasks assigned to the user from Google Docs or Chat Spaces. Defaults to false.",
      )
      .default(false),
    dueMin: z
      .string()
      .datetime({ offset: true })
      .describe(
        "Lower bound (inclusive) for a task's due date, RFC3339 (date-only is honored). Filters by day.",
      )
      .optional(),
    dueMax: z
      .string()
      .datetime({ offset: true })
      .describe("Upper bound (inclusive) for a task's due date, RFC3339.")
      .optional(),
    completedMin: z
      .string()
      .datetime({ offset: true })
      .describe(
        "Lower bound (inclusive) for a task's completion date, RFC3339.",
      )
      .optional(),
    completedMax: z
      .string()
      .datetime({ offset: true })
      .describe(
        "Upper bound (inclusive) for a task's completion date, RFC3339.",
      )
      .optional(),
    updatedMin: z
      .string()
      .datetime({ offset: true })
      .describe(
        "Lower bound (inclusive) for a task's last-modified time, RFC3339.",
      )
      .optional(),
    maxResults: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe(
        "Max tasks to return per page. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    pageToken: z
      .string()
      .describe(
        "Pass the nextPageToken from a previous response to fetch the next page.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z.string().nullable().describe("Task id.").optional(),
            title: z
              .string()
              .nullable()
              .describe("Title of the task.")
              .optional(),
            notes: z
              .string()
              .nullable()
              .describe("Free-text notes.")
              .optional(),
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
              .describe(
                "Link to the task in the Google Tasks web UI. Read-only.",
              )
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
          .describe("A task."),
      )
      .nullable()
      .describe("The tasks on this page.")
      .optional(),
    nextPageToken: z
      .string()
      .nullable()
      .describe(
        "Pass as pageToken to fetch the next page. Absent when there are no more pages.",
      )
      .optional(),
  })
  .describe("A page of tasks.");

const definition = defineTool({
  name: "listTasks",
  title: "List Tasks",
  description:
    "List or search tasks in a list. Returns active tasks by default; set showCompleted to include completed tasks, or filter by due date or update time.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-tasks",
  run: async (input, ctx) => {
    const url = new URL(
      `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(input.tasklist)}/tasks`,
    );
    if (input.showCompleted !== undefined) {
      url.searchParams.set("showCompleted", String(input.showCompleted));
    }
    // showHidden follows showCompleted unless the agent set it explicitly, so
    // requesting completed tasks returns the complete set (incl. app-completed
    // tasks, which the API marks hidden).
    url.searchParams.set(
      "showHidden",
      String(input.showHidden ?? input.showCompleted),
    );
    if (input.showDeleted !== undefined) {
      url.searchParams.set("showDeleted", String(input.showDeleted));
    }
    if (input.showAssigned !== undefined) {
      url.searchParams.set("showAssigned", String(input.showAssigned));
    }
    if (input.dueMin !== undefined) {
      url.searchParams.set("dueMin", String(input.dueMin));
    }
    if (input.dueMax !== undefined) {
      url.searchParams.set("dueMax", String(input.dueMax));
    }
    if (input.completedMin !== undefined) {
      url.searchParams.set("completedMin", String(input.completedMin));
    }
    if (input.completedMax !== undefined) {
      url.searchParams.set("completedMax", String(input.completedMax));
    }
    if (input.updatedMin !== undefined) {
      url.searchParams.set("updatedMin", String(input.updatedMin));
    }
    url.searchParams.set("maxResults", String(input.maxResults ?? 20));
    if (input.pageToken !== undefined) {
      url.searchParams.set("pageToken", String(input.pageToken));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwForGoogleTasks(res, "listTasks");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
