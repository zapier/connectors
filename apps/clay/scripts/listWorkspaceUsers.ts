#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    workspaceId: z.string().describe("Workspace id, from listWorkspaces."),
  })
  .strict();
const outputSchema = z.object({
  users: z
    .array(
      z.object({
        // Clay returns the user id as a number here (unlike getCurrentUser's
        // string userId); coerce so the connector surface is consistently a
        // string and usable as a users cell's userIds value.
        id: z.coerce
          .string()
          .describe("User id — used in a users cell's userIds."),
        name: z.string().nullable().describe("User's display name.").optional(),
        email: z.string().nullable().describe("User's email.").optional(),
      }),
    )
    .nullable()
    .optional(),
});

const definition = defineTool({
  name: "listWorkspaceUsers",
  title: "List Workspace Users",
  description:
    "List members of a workspace. Use it to resolve a user id for a users-type cell or a filter value.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "clay",
  run: async (input, ctx) => {
    const url = `https://api.clay.com/v3/workspaces/${encodeURIComponent(input.workspaceId)}/users`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Clay listWorkspaceUsers");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
