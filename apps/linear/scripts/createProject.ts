#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { linearGraphql } from "../lib/linearGraphql.ts";

const inputSchema = z
  .object({
    name: z.string().describe("Project name."),
    teamIds: z
      .array(z.uuid())
      .describe(
        "Teams the project belongs to (at least one). Resolve with listTeams.",
      ),
    description: z.string().describe("Short description / summary.").optional(),
    leadId: z
      .uuid()
      .describe("Project lead user id. Resolve with listUsers.")
      .optional(),
    startDate: z.string().describe("Start date as YYYY-MM-DD.").optional(),
    targetDate: z.string().describe("Target date as YYYY-MM-DD.").optional(),
  })
  .strict();

const outputSchema = z.object({
  id: z.uuid().describe("The project's UUID."),
  name: z.string(),
  url: z.string().describe("The project's URL in Linear."),
});

const CREATE_PROJECT = `
mutation ProjectCreate($input: ProjectCreateInput!) {
  projectCreate(input: $input) {
    success
    project { id name url }
  }
}`;

const definition = defineTool({
  name: "createProject",
  title: "Create Project",
  description:
    "Create a Linear project in one or more teams, with an optional description, lead, and start/target dates.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "linear",
  run: async (input, ctx) => {
    const gqlInput: Record<string, unknown> = {
      name: input.name,
      teamIds: input.teamIds,
    };
    if (input.description !== undefined)
      gqlInput.description = input.description;
    if (input.leadId !== undefined) gqlInput.leadId = input.leadId;
    if (input.startDate !== undefined) gqlInput.startDate = input.startDate;
    if (input.targetDate !== undefined) gqlInput.targetDate = input.targetDate;

    const data = await linearGraphql<{
      projectCreate: { project: z.infer<typeof outputSchema> };
    }>(ctx.fetch, CREATE_PROJECT, { input: gqlInput });
    return data.projectCreate.project;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
