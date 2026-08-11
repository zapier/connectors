#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { gitlabGraphql } from "../lib/gitlab.ts";

const inputSchema = z
  .object({
    id: z
      .string()
      .describe(
        "The work item's global GraphQL id (e.g. gid://gitlab/WorkItem/123).",
      ),
    title: z.string().describe("New title.").optional(),
    description: z
      .string()
      .describe("New markdown body (replaces the existing body).")
      .optional(),
    stateEvent: z
      .enum(["CLOSE", "REOPEN"])
      .describe("Close or reopen the work item.")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  id: z.string(),
  iid: z.string().nullable(),
  title: z.string(),
  state: z.string(),
  webUrl: z.string(),
});

const UPDATE_MUTATION = `
  mutation UpdateWorkItem($input: WorkItemUpdateInput!) {
    workItemUpdate(input: $input) {
      workItem { id iid title state webUrl }
      errors
    }
  }`;

interface WorkItemPayload {
  id: string;
  iid: string | null;
  title: string;
  state: string;
  webUrl: string;
}

const definition = defineTool({
  name: "updateWorkItem",
  title: "Update Work Item",
  description:
    "Update a work item's title or description, or close/reopen it. Only supplied fields change. Takes the work item's global GraphQL id.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "gitlab",
  run: async (input, ctx) => {
    // Build the input with only the fields the caller supplied. Omit
    // descriptionWidget entirely when no description is given — sending a null
    // description would clear the existing body.
    const gqlInput: Record<string, unknown> = { id: input.id };
    if (input.title !== undefined) gqlInput.title = input.title;
    if (input.stateEvent !== undefined) gqlInput.stateEvent = input.stateEvent;
    if (input.description !== undefined) {
      gqlInput.descriptionWidget = { description: input.description };
    }

    const data = (await gitlabGraphql(ctx.fetch, UPDATE_MUTATION, {
      input: gqlInput,
    })) as {
      workItemUpdate?: { workItem: WorkItemPayload | null; errors: string[] };
    };
    const payload = data.workItemUpdate;
    if (payload?.errors?.length) {
      throw new Error(
        `GitLab could not update the work item: ${payload.errors.join("; ")}`,
      );
    }
    const wi = payload?.workItem;
    if (!wi) throw new Error("GitLab returned no work item on update.");
    return {
      id: wi.id,
      iid: wi.iid,
      title: wi.title,
      state: wi.state,
      webUrl: wi.webUrl,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
