#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { deriveAgentResult } from "../lib/perplexity.ts";

const inputSchema = z
  .object({
    response_id: z.string().describe("The id returned by createAgent."),
  })
  .strict();
const outputSchema = z
  .object({
    answer: z
      .string()
      .describe(
        "The agent's answer text, aggregated from the response message. Empty while the run is still queued/in_progress.",
      ),
    sources: z
      .array(
        z.object({
          title: z.string().optional().describe("Title of the source page."),
          url: z.string().optional().describe("URL of the source page."),
          snippet: z.string().optional().describe("Excerpt from the source."),
        }),
      )
      .describe("The web sources the answer drew on (when web search ran)."),
    id: z
      .string()
      .describe(
        "Unique identifier for this response. Pass it to getAgentResponse to poll a background run.",
      ),
    object: z.string().describe('Object type ("response").'),
    created_at: z
      .number()
      .int()
      .describe("Unix timestamp when the response was created."),
    status: z
      .enum([
        "queued",
        "in_progress",
        "completed",
        "incomplete",
        "failed",
        "cancelled",
      ])
      .describe(
        'Response status. A background run is "queued"/"in_progress" until it reaches a terminal status; poll getAgentResponse until "completed".',
      ),
    model: z.string().describe("The model that generated the answer."),
    output: z
      .array(
        z
          .object({
            type: z
              .string()
              .describe('The item type, e.g. "message" or "search_results".'),
            role: z
              .string()
              .nullable()
              .describe(
                'For a message item, the author role (usually "assistant").',
              )
              .optional(),
            content: z
              .any()
              .nullable()
              .describe("Nested object — shape passes through.")
              .optional(),
            results: z
              .any()
              .nullable()
              .describe("Nested object — shape passes through.")
              .optional(),
          })
          .describe(
            "One item in the agent's output — a message with content, or a set of search results.",
          ),
      )
      .describe(
        "The output items — the assistant message(s) and the search-results item. Read the answer from the message item's content parts.",
      ),
    usage: z
      .object({
        input_tokens: z.number().int().describe("Tokens in the input."),
        output_tokens: z.number().int().describe("Tokens generated."),
        total_tokens: z.number().int().describe("Total tokens used."),
        cost: z
          .object({
            total_cost: z
              .number()
              .nullable()
              .describe("Total cost of the request in USD.")
              .optional(),
          })
          .nullable()
          .describe("Cost breakdown for the request, in USD.")
          .optional(),
      })
      .nullable()
      .describe("Token counts and cost for the request.")
      .optional(),
  })
  .describe("A web-grounded answer with its sources and status.");

const definition = defineTool({
  name: "getAgentResponse",
  title: "Get Agent Response",
  description:
    'Fetch a previously created agent response by its id. Use this to poll a background run until its status is "completed", then read the answer from its output.',
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "perplexity",
  run: async (input, ctx) => {
    const url = `https://api.perplexity.ai/v1/responses/${encodeURIComponent(input.response_id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Perplexity getAgentResponse");
    const data = (await res.json()) as Record<string, unknown>;
    return { ...data, ...deriveAgentResult(data) };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
