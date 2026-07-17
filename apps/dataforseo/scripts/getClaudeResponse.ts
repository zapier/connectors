#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLiveRaw, shapeLlmResponse } from "../lib/dataforseo.ts";

const inputSchema = z
  .object({
    user_prompt: z
      .string()
      .describe("The prompt or question to send to the model."),
    model_name: z
      .string()
      .describe('Claude model name, e.g. "claude-sonnet-4".'),
    max_output_tokens: z
      .number()
      .int()
      .describe("Cap on tokens in the AI response.")
      .optional(),
    temperature: z.number().describe("Randomness of the response").optional(),
    top_p: z.number().describe("Nucleus-sampling diversity").optional(),
    web_search: z
      .boolean()
      .describe("Allow the model to use web search.")
      .optional(),
    force_web_search: z
      .boolean()
      .describe("Force the model to use web search.")
      .optional(),
    web_search_country_iso_code: z
      .string()
      .describe('ISO country code to localize web search, e.g. "US".')
      .optional(),
    web_search_city: z
      .string()
      .describe("City name to localize web search.")
      .optional(),
    system_message: z
      .string()
      .describe("System instructions steering the model's behavior.")
      .optional(),
    message_chain: z
      .array(z.record(z.string(), z.json()))
      .describe(
        "Prior conversation turns to continue, each a role/content message.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items_count: z
    .number()
    .int()
    .describe("Number of responses returned (usually 1)."),
  cost: z.number().nullable().describe("Credit cost in USD.").optional(),
  items: z
    .array(
      z.object({
        model_name: z
          .string()
          .nullable()
          .describe("Model that answered.")
          .optional(),
        message: z
          .string()
          .nullable()
          .describe("The model's text response.")
          .optional(),
        money_spent: z
          .number()
          .nullable()
          .describe("Credit cost of the call.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Model responses.")
    .optional(),
});

const definition = defineTool({
  name: "getClaudeResponse",
  title: "Get Claude Response",
  description:
    "Send a prompt to a Claude model and get its structured response, optionally with web search.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "dataforseo",
  run: async (input, ctx) => {
    const params: Record<string, unknown> = {};
    if (input.user_prompt !== undefined)
      params["user_prompt"] = input.user_prompt;
    if (input.model_name !== undefined) params["model_name"] = input.model_name;
    if (input.max_output_tokens !== undefined)
      params["max_output_tokens"] = input.max_output_tokens;
    if (input.temperature !== undefined)
      params["temperature"] = input.temperature;
    if (input.top_p !== undefined) params["top_p"] = input.top_p;
    if (input.web_search !== undefined) params["web_search"] = input.web_search;
    if (input.force_web_search !== undefined)
      params["force_web_search"] = input.force_web_search;
    if (input.web_search_country_iso_code !== undefined)
      params["web_search_country_iso_code"] = input.web_search_country_iso_code;
    if (input.web_search_city !== undefined)
      params["web_search_city"] = input.web_search_city;
    if (input.system_message !== undefined)
      params["system_message"] = input.system_message;
    if (input.message_chain !== undefined)
      params["message_chain"] = input.message_chain;
    return shapeLlmResponse(
      await dataforseoLiveRaw(
        ctx.fetch,
        "/v3/ai_optimization/claude/llm_responses/live",
        params,
        "DataForSEO getClaudeResponse",
      ),
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
