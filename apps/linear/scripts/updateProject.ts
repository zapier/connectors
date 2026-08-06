#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { linearGraphql } from "../lib/linearGraphql.ts";

const inputSchema = z
  .object({
    projectId: z
      .uuid()
      .describe("Project to update. Resolve with listProjects."),
    name: z.string().describe("New name.").optional(),
    description: z.string().describe("New description.").optional(),
    state: z
      .enum(["planned", "started", "paused", "completed", "canceled"])
      .describe("Project state.")
      .optional(),
    leadId: z
      .uuid()
      .describe("New lead user id. Resolve with listUsers.")
      .optional(),
    targetDate: z.string().describe("Target date as YYYY-MM-DD.").optional(),
  })
  .strict();

const outputSchema = z.object({
  id: z.uuid().describe("The project's UUID."),
  name: z.string(),
  url: z.string().describe("The project's URL in Linear."),
  state: z.string().describe("Project state.").optional(),
});

const UPDATE_PROJECT = `
mutation ProjectUpdate($id: String!, $input: ProjectUpdateInput!) {
  projectUpdate(id: $id, input: $input) {
    success
    project { id name url state }
  }
}`;

const definition = defineTool({
  name: "updateProject",
  title: "Update Project",
  description:
    "Update a Linear project's name, description, state, lead, or target date.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "linear",
  run: async (input, ctx) => {
    const gqlInput: Record<string, unknown> = {};
    if (input.name !== undefined) gqlInput.name = input.name;
    if (input.description !== undefined)
      gqlInput.description = input.description;
    if (input.state !== undefined) gqlInput.state = input.state;
    if (input.leadId !== undefined) gqlInput.leadId = input.leadId;
    if (input.targetDate !== undefined) gqlInput.targetDate = input.targetDate;

    const data = await linearGraphql<{
      projectUpdate: { project: z.infer<typeof outputSchema> };
    }>(ctx.fetch, UPDATE_PROJECT, { id: input.projectId, input: gqlInput });
    return data.projectUpdate.project;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
