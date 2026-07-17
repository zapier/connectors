#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z.object({ languages: z.array(z.string()) });

const definition = defineTool({
  name: "listTranslationLanguages",
  title: "List Translation Languages",
  description:
    "List the languages supported for video translation. Call before translateVideo so output_languages uses exact supported values.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "heygen",
  run: async (_input, ctx) => {
    const url = `https://api.heygen.com/v3/video-translations/languages`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Heygen listTranslationLanguages");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
