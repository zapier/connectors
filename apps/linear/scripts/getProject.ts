#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { linearGraphql } from "../lib/linearGraphql.ts";

const inputSchema = z
  .object({
    projectId: z.uuid().describe("Project id. Resolve with listProjects."),
  })
  .strict();

const outputSchema = z.object({
  id: z.uuid().describe("The project's UUID."),
  name: z.string(),
  description: z.string().describe("Project description.").optional(),
  url: z.string().describe("The project's URL in Linear."),
  state: z.string().describe("Project state.").optional(),
});

const GET_PROJECT = `
query Project($id: String!) {
  project(id: $id) {
    id name description url state
  }
}`;

const definition = defineTool({
  name: "getProject",
  title: "Get Project",
  description:
    "Fetch a single Linear project by its id, with its name, description, url, and state.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "linear",
  run: async (input, ctx) => {
    const data = await linearGraphql<{
      project: z.infer<typeof outputSchema>;
    }>(ctx.fetch, GET_PROJECT, { id: input.projectId });
    return data.project;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
