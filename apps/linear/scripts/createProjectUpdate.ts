#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { linearGraphql } from "../lib/linearGraphql.ts";

const inputSchema = z
  .object({
    projectId: z
      .uuid()
      .describe("Project to post the update to. Resolve with listProjects."),
    body: z.string().describe("Update body in Markdown."),
    health: z
      .enum(["onTrack", "atRisk", "offTrack"])
      .describe("Project health for this update.")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  id: z.uuid().describe("The project update's UUID."),
  url: z.string().describe("The project update's URL in Linear."),
});

const CREATE_PROJECT_UPDATE = `
mutation ProjectUpdateCreate($input: ProjectUpdateCreateInput!) {
  projectUpdateCreate(input: $input) {
    success
    projectUpdate { id url }
  }
}`;

const definition = defineTool({
  name: "createProjectUpdate",
  title: "Create Project Update",
  description:
    "Post a status update to a Linear project, with an optional health signal (onTrack, atRisk, offTrack).",
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
      projectId: input.projectId,
      body: input.body,
    };
    if (input.health !== undefined) gqlInput.health = input.health;

    const data = await linearGraphql<{
      projectUpdateCreate: { projectUpdate: z.infer<typeof outputSchema> };
    }>(ctx.fetch, CREATE_PROJECT_UPDATE, { input: gqlInput });
    return data.projectUpdateCreate.projectUpdate;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
