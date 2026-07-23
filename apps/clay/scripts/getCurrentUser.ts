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
  userId: z
    .string()
    .nullable()
    .describe("The caller's Clay user id.")
    .optional(),
  email: z.string().nullable().describe("The caller's email.").optional(),
});

const definition = defineTool({
  name: "getCurrentUser",
  title: "Get Current User",
  description:
    "Return the authenticated caller's user id and email. The user id is the entry point for listWorkspaces; a failure here means the API key is invalid.",
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
    const url = `https://api.clay.com/v3/`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Clay getCurrentUser");
    // The root endpoint nests identity under `auth`; flatten to { userId, email }.
    const payload = (await res.json()) as {
      auth?: { email?: string; actor?: { userId?: string } };
    };
    return {
      userId: payload.auth?.actor?.userId,
      email: payload.auth?.email,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
