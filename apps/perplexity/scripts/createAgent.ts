#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { buildTools, deriveAgentResult } from "../lib/perplexity.ts";

const inputSchema = z
  .object({
    input: z
      .string()
      .describe("The question or instruction for the agent to respond to."),
    instructions: z
      .string()
      .describe(
        "System instructions that steer how the agent responds (tone, format, role).",
      )
      .optional(),
    model: z
      .string()
      .describe(
        'Model id in provider/model form, e.g. "perplexity/sonar" or "openai/gpt-5". Call listModels to discover available ids (including deep-research models). Leave unset to use a preset. Mutually exclusive with preset.',
      )
      .optional(),
    preset: z
      .enum(["fast", "low", "medium", "high", "xhigh"])
      .describe(
        "A pre-configured model + search + reasoning profile. Use higher presets (high/xhigh) for deeper research. Alternative to model.",
      )
      .optional(),
    enable_web_search: z
      .boolean()
      .describe(
        "Whether the agent searches the web to ground its answer. Defaults to true; set false to answer from the model's own knowledge only.",
      )
      .optional(),
    search_domain_filter: z
      .array(z.string())
      .describe(
        'When web search is on, limit sources to these domains; prefix a domain with "-" to exclude it.',
      )
      .optional(),
    search_recency_filter: z
      .enum(["hour", "day", "week", "month", "year"])
      .describe(
        "When web search is on, only use sources published within this window.",
      )
      .optional(),
    search_after_date_filter: z
      .string()
      .describe(
        "When web search is on, only use sources published on or after this date. Format MM/DD/YYYY.",
      )
      .optional(),
    search_before_date_filter: z
      .string()
      .describe(
        "When web search is on, only use sources published on or before this date. Format MM/DD/YYYY.",
      )
      .optional(),
    reasoning_effort: z
      .enum(["minimal", "low", "medium", "high", "xhigh", "max"])
      .describe(
        "How much internal reasoning the agent spends. Higher is more thorough but slower and costlier.",
      )
      .optional(),
    response_format: z
      .object({
        type: z.literal("json_schema").describe('Must be "json_schema".'),
        json_schema: z
          .object({
            name: z.string().describe("A name for the schema.").optional(),
            schema: z
              .record(z.string(), z.any())
              .describe(
                "The JSON Schema object the output must match. Note the Agent API requires additionalProperties false, named schemas, and all properties required.",
              ),
            strict: z
              .boolean()
              .describe(
                "Whether to strictly enforce the schema. Defaults to true.",
              )
              .optional(),
          })
          .strict()
          .describe(
            "A JSON schema the answer must conform to (structured output).",
          ),
      })
      .strict()
      .describe("Request typed (structured) output instead of prose.")
      .optional(),
    max_output_tokens: z
      .number()
      .int()
      .gte(1)
      .describe("Maximum tokens to generate in the answer.")
      .optional(),
    temperature: z
      .number()
      .gte(0)
      .lte(2)
      .describe("Randomness of the output (0–2). Lower is more focused.")
      .optional(),
    background: z
      .boolean()
      .describe(
        'Run asynchronously for long jobs (e.g. deep research). Returns immediately with status "queued" and an id; poll getAgentResponse with that id until the status is "completed".',
      )
      .optional(),
  })
  .strict();
const outputSchema = z
  .object({
    answer: z
      .string()
      .describe(
        "The agent's answer text, aggregated from the response message. Empty while a background run is still queued/in_progress.",
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
  name: "createAgent",
  title: "Create Agent",
  description:
    "Ask a question and get a current, web-grounded answer with citations. Optionally enable web search, pick a model or preset, request structured output, and run long jobs in the background. Reach for this for a synthesized answer rather than a list of links.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "perplexity",
  run: async (input, ctx) => {
    const url = `https://api.perplexity.ai/v1/agent`;
    const body: Record<string, unknown> = { input: input.input };
    if (input.instructions !== undefined)
      body["instructions"] = input.instructions;
    // Exactly one of model/preset is required; default to a balanced preset so the
    // tool is callable with just `input`.
    if (input.model !== undefined) body["model"] = input.model;
    else body["preset"] = input.preset ?? "medium";
    if (input.reasoning_effort !== undefined)
      body["reasoning_effort"] = input.reasoning_effort;
    if (input.response_format !== undefined)
      body["response_format"] = input.response_format;
    if (input.max_output_tokens !== undefined)
      body["max_output_tokens"] = input.max_output_tokens;
    if (input.temperature !== undefined)
      body["temperature"] = input.temperature;
    if (input.background !== undefined) body["background"] = input.background;
    // Web search is a `tools` entry on the Agent API, not top-level fields; assemble it
    // from the flat search inputs (on by default; dates loosened to accept ISO).
    const tools = buildTools(input);
    if (tools !== undefined) body["tools"] = tools;

    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Perplexity createAgent");
    const data = (await res.json()) as Record<string, unknown>;
    return { ...data, ...deriveAgentResult(data) };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
