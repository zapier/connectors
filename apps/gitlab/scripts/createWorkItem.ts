#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { gitlabGraphql } from "../lib/gitlab.ts";

const inputSchema = z
  .object({
    namespacePath: z
      .string()
      .describe(
        "Full path of the project or group to create the work item in (e.g. group/project or group).",
      ),
    workItemType: z
      .string()
      .describe(
        "Work-item type name, e.g. EPIC, ISSUE, TASK, OBJECTIVE. Availability depends on tier.",
      ),
    title: z.string().describe("Work item title."),
    description: z
      .string()
      .describe("Markdown body (GitLab-flavored markdown).")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  id: z.string(),
  iid: z.string().nullable(),
  title: z.string(),
  workItemType: z.string().nullable(),
  state: z.string(),
  webUrl: z.string(),
});

const TYPES_QUERY = `
  query WorkItemTypes($fullPath: ID!) {
    namespace(fullPath: $fullPath) { workItemTypes { nodes { id name } } }
  }`;

const CREATE_MUTATION = `
  mutation CreateWorkItem($input: WorkItemCreateInput!) {
    workItemCreate(input: $input) {
      workItem { id iid title state webUrl workItemType { name } }
      errors
    }
  }`;

interface WorkItemPayload {
  id: string;
  iid: string | null;
  title: string;
  state: string;
  webUrl: string;
  workItemType?: { name?: string } | null;
}

const definition = defineTool({
  name: "createWorkItem",
  title: "Create Work Item",
  description:
    "Create a work item (epic, task, objective, issue) in a project or group with a markdown description. Work items are a Premium/Ultimate surface.",
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
    // Resolve the type name to its global work-item-type id (create takes a gid, not a name).
    const typeData = (await gitlabGraphql(ctx.fetch, TYPES_QUERY, {
      fullPath: input.namespacePath,
    })) as {
      namespace?: { workItemTypes?: { nodes: { id: string; name: string }[] } };
    };
    const types = typeData.namespace?.workItemTypes?.nodes ?? [];
    const match = types.find(
      (t) => t.name.toUpperCase() === input.workItemType.toUpperCase(),
    );
    if (!match) {
      throw new Error(
        `Work item type "${input.workItemType}" is not available in ${input.namespacePath}. Available types: ${types.map((t) => t.name).join(", ") || "(none)"}.`,
      );
    }

    const gqlInput: Record<string, unknown> = {
      namespacePath: input.namespacePath,
      workItemTypeId: match.id,
      title: input.title,
    };
    if (input.description !== undefined) {
      gqlInput.descriptionWidget = { description: input.description };
    }

    const data = (await gitlabGraphql(ctx.fetch, CREATE_MUTATION, {
      input: gqlInput,
    })) as {
      workItemCreate?: { workItem: WorkItemPayload | null; errors: string[] };
    };
    const payload = data.workItemCreate;
    if (payload?.errors?.length) {
      throw new Error(
        `GitLab could not create the work item: ${payload.errors.join("; ")}`,
      );
    }
    const wi = payload?.workItem;
    if (!wi) throw new Error("GitLab returned no work item on create.");
    return {
      id: wi.id,
      iid: wi.iid,
      title: wi.title,
      workItemType: wi.workItemType?.name ?? null,
      state: wi.state,
      webUrl: wi.webUrl,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
