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
  id: z.number().int(),
  username: z.string(),
  name: z.string().nullable().optional(),
  email: z.union([z.string(), z.null()]).optional(),
});

const definition = defineTool({
  name: "getCurrentUser",
  title: "Get Current User",
  description:
    "Get the identity of the authenticated token (who am I). Also serves as the connection test.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "gitlab",
  run: async (_input, ctx) => {
    const url = `https://gitlab.com/api/v4/user`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab getCurrentUser");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
