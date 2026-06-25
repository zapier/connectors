#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwForGoogleTasks } from "../lib/google-tasks.ts";

const inputSchema = z
  .object({
    maxResults: z
      .number()
      .int()
      .gte(1)
      .lte(1000)
      .describe(
        "Max task lists to return per page. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
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
            id: z
              .string()
              .nullable()
              .describe(
                "Task-list id. Pass as the tasklist path parameter on task calls.",
              )
              .optional(),
            title: z
              .string()
              .nullable()
              .describe("Title of the task list.")
              .optional(),
            updated: z
              .string()
              .datetime({ offset: true })
              .nullable()
              .describe("Last-modified time (RFC3339). Read-only.")
              .optional(),
          })
          .describe("A task list."),
      )
      .nullable()
      .describe("The task lists on this page.")
      .optional(),
    nextPageToken: z
      .string()
      .nullable()
      .describe(
        "Pass as pageToken to fetch the next page. Absent when there are no more pages.",
      )
      .optional(),
  })
  .describe("A page of task lists.");

const definition = defineTool({
  name: "listTaskLists",
  title: "List Task Lists",
  description:
    "List the user's task lists with their id and title. The primary way to resolve a task-list id before any task call.",
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
      `https://tasks.googleapis.com/tasks/v1/users/@me/lists`,
    );
    url.searchParams.set("maxResults", String(input.maxResults ?? 20));
    if (input.pageToken !== undefined) {
      url.searchParams.set("pageToken", String(input.pageToken));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwForGoogleTasks(res, "listTaskLists");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
