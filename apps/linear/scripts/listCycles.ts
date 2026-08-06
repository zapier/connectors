#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { linearGraphql } from "../lib/linearGraphql.ts";

const inputSchema = z
  .object({
    teamId: z
      .uuid()
      .describe(
        "Team whose cycles to list — cycles are team-scoped. Resolve with listTeams.",
      ),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe("Max cycles to return. Defaults to 50 when omitted.")
      .optional(),
    cursor: z
      .string()
      .describe("Pass nextCursor from a previous call to fetch the next page.")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  cycles: z.array(
    z.object({
      id: z.uuid(),
      name: z
        .string()
        .describe("Cycle name; may be null for unnamed cycles.")
        .nullable()
        .optional(),
      number: z.number().describe("Sequential cycle number within the team."),
      startsAt: z.string().describe("ISO 8601 start.").optional(),
      endsAt: z.string().describe("ISO 8601 end.").optional(),
    }),
  ),
  nextCursor: z
    .string()
    .nullable()
    .describe("Pass as `cursor` to fetch the next page; null when no more."),
  hasMore: z.boolean().describe("True if more cycles are available."),
});

const LIST_CYCLES = `
query Cycles($filter: CycleFilter, $first: Int, $after: String) {
  cycles(filter: $filter, first: $first, after: $after) {
    nodes { id name number startsAt endsAt }
    pageInfo { hasNextPage endCursor }
  }
}`;

const definition = defineTool({
  name: "listCycles",
  title: "List Cycles",
  description:
    "List a team's cycles (sprints). The current cycle is the one whose startsAt/endsAt spans now. Resolve a cycle to its id. Returns a page plus a cursor.",
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
      cycles: {
        nodes: z.infer<typeof outputSchema>["cycles"];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>(ctx.fetch, LIST_CYCLES, {
      filter: { team: { id: { eq: input.teamId } } },
      first: input.limit ?? 50,
      after: input.cursor,
    });

    return {
      cycles: data.cycles.nodes,
      nextCursor: data.cycles.pageInfo.hasNextPage
        ? data.cycles.pageInfo.endCursor
        : null,
      hasMore: data.cycles.pageInfo.hasNextPage,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
