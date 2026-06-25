#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwForGoogleTasks } from "../lib/google-tasks.ts";

// The Google Tasks API has NO server-side task search, so findTask is authored
// (not codegen-scaffolded): it lists tasks, pages through nextPageToken, and
// matches the title client-side — exact (case-insensitive) preferred, else the
// closest substring match. It can also search completed tasks via
// showCompleted.

const MAX_PAGES = 20;

const inputSchema = z
  .object({
    tasklist: z.string().describe("Task-list id (resolve via listTaskLists)."),
    title: z
      .string()
      .describe(
        "Title text to match (case-insensitive). An exact match wins; otherwise the closest title that contains this text is returned.",
      ),
    showCompleted: z
      .boolean()
      .describe(
        "Also search completed tasks. Defaults to false (active tasks only).",
      )
      .default(false),
  })
  .strict();

const TaskSchema = z
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

const outputSchema = z
  .object({
    found: z.boolean().describe("Whether a matching task was found."),
    matchType: z
      .enum(["exact", "substring", "none"])
      .describe(
        "How the title matched: exact (case-insensitive equality), substring (title contains the query), or none.",
      ),
    task: TaskSchema.nullable().describe(
      "The best-matching task, or null when nothing matched.",
    ),
  })
  .describe(
    "The matched task. Use task.id for follow-up updateTask/deleteTask/moveTask calls.",
  );

interface WireTask {
  title?: string | null;
  [k: string]: unknown;
}

const definition = defineTool({
  name: "findTask",
  title: "Find Task",
  description:
    "Find a task in a list by title (case-insensitive; exact match preferred, else the closest match). Returns the matching task — use its id for a follow-up update, complete, or delete. The Google Tasks API has no title search, so this lists and matches for you.",
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
    const target = input.title.toLowerCase();
    let firstSubstring: WireTask | undefined;
    let pageToken: string | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
      const url = new URL(
        `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(input.tasklist)}/tasks`,
      );
      url.searchParams.set("maxResults", "100");
      url.searchParams.set("showCompleted", String(input.showCompleted));
      // Pair showHidden with showCompleted so app-completed tasks are searchable too.
      url.searchParams.set("showHidden", String(input.showCompleted));
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await ctx.fetch(url.toString(), { method: "GET" });
      await throwForGoogleTasks(res, "findTask");
      const body = (await res.json()) as {
        items?: WireTask[];
        nextPageToken?: string;
      };
      const items = body.items ?? [];

      for (const item of items) {
        const t = (item.title ?? "").toLowerCase();
        if (t === target) {
          return { found: true, matchType: "exact" as const, task: item };
        }
        if (firstSubstring === undefined && t !== "" && t.includes(target)) {
          firstSubstring = item;
        }
      }

      if (!body.nextPageToken) break;
      pageToken = body.nextPageToken;
    }

    if (firstSubstring !== undefined) {
      return {
        found: true,
        matchType: "substring" as const,
        task: firstSubstring,
      };
    }
    return { found: false, matchType: "none" as const, task: null };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
