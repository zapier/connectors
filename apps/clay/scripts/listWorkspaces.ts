#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z.object({
  workspaces: z
    .array(
      z.object({
        id: z.coerce.string().describe("Workspace id."),
        name: z.string().nullable().describe("Workspace name.").optional(),
      }),
    )
    .nullable()
    .optional(),
});

const definition = defineTool({
  name: "listWorkspaces",
  title: "List Workspaces",
  description:
    "List the workspaces the caller can access. Start here, then listTables to reach a table.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "clay",
  run: async (_input, ctx) => {
    // `userId` is not an agent input — the workspaces path needs the caller's
    // own id, so resolve it from the identity endpoint first, then list.
    const meRes = await ctx.fetch(`https://api.clay.com/v3/`, {
      method: "GET",
    });
    await throwIfNotOk(meRes, "Clay listWorkspaces (identity)");
    const me = (await meRes.json()) as {
      auth?: { actor?: { userId?: string } };
    };
    const userId = me.auth?.actor?.userId;
    if (!userId) {
      throw new Error(
        "Clay listWorkspaces: could not resolve the caller's user id from the API key.",
      );
    }
    const url = `https://api.clay.com/v3/users/${encodeURIComponent(userId)}/workspaces`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Clay listWorkspaces");
    // The /v3 list endpoint returns the rows under `results`; present them
    // under the agent-facing `workspaces` key.
    const payload = (await res.json()) as { results?: unknown[] };
    return { workspaces: payload.results ?? [] };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
