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
        "The work item's global GraphQL id (e.g. gid://gitlab/WorkItem/123), from listWorkItems.",
      ),
  })
  .strict();

const outputSchema = z.object({
  id: z.string(),
  iid: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  workItemType: z.string().nullable(),
  state: z.string(),
  webUrl: z.string(),
});

const QUERY = `
  query GetWorkItem($id: WorkItemID!) {
    workItem(id: $id) {
      id iid title state webUrl
      workItemType { name }
      widgets { ... on WorkItemWidgetDescription { description } }
    }
  }`;

interface DescriptionWidget {
  description?: string | null;
}

const definition = defineTool({
  name: "getWorkItem",
  title: "Get Work Item",
  description:
    "Get one work item's full detail including its markdown description and type. Takes the work item's global GraphQL id.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "gitlab",
  run: async (input, ctx) => {
    const data = (await gitlabGraphql(ctx.fetch, QUERY, { id: input.id })) as {
      workItem?: {
        id: string;
        iid: string | null;
        title: string;
        state: string;
        webUrl: string;
        workItemType?: { name?: string } | null;
        widgets?: DescriptionWidget[];
      } | null;
    };
    const wi = data.workItem;
    if (!wi) throw new Error(`Work item not found: ${input.id}`);
    const description =
      wi.widgets?.find((w) => typeof w.description === "string")?.description ??
      null;
    return {
      id: wi.id,
      iid: wi.iid,
      title: wi.title,
      description,
      workItemType: wi.workItemType?.name ?? null,
      state: wi.state,
      webUrl: wi.webUrl,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
