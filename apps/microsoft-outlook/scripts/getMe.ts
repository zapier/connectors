#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { GRAPH_BASE, outlookFetch } from "../lib/graph.ts";

const inputSchema = z.object({}).strict();

const outputSchema = z.object({
  id: z.string(),
  displayName: z.string().optional(),
  mail: z.string().optional(),
  userPrincipalName: z.string(),
  jobTitle: z.string().optional(),
  mobilePhone: z.string().optional(),
});

const definition = defineTool({
  name: "getMe",
  title: "Get Me",
  description:
    'Retrieve the signed-in user\'s profile — id, displayName, mail, and userPrincipalName. Doubles as the auth probe (a 200 confirms the connection works). Call this first to resolve "my email" before composing or filtering mail.',
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-outlook",
  run: async (_input, ctx) => {
    const url = `${GRAPH_BASE}/me`;
    const res = await outlookFetch(ctx.fetch, "getMe", url);
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
