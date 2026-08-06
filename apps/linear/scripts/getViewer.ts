#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { linearGraphql } from "../lib/linearGraphql.ts";

const inputSchema = z.object({}).strict();

const outputSchema = z.object({
  id: z.uuid().describe("The authenticated user's id — use it as assigneeId."),
  name: z.string(),
  email: z.string().optional(),
  displayName: z.string().optional(),
});

const GET_VIEWER = `
query Viewer {
  viewer { id name email displayName }
}`;

const definition = defineTool({
  name: "getViewer",
  title: "Get Viewer",
  description:
    'Return the authenticated user (the "me" identity) — id, name, email. Use the id to assign issues to yourself or filter your own issues.',
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "linear",
  run: async (_input, ctx) => {
    const data = await linearGraphql<{
      viewer: z.infer<typeof outputSchema>;
    }>(ctx.fetch, GET_VIEWER);

    return data.viewer;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
