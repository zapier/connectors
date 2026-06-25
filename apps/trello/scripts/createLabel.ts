#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    name: z.string().optional(),
    color: z
      .enum([
        "yellow",
        "purple",
        "blue",
        "red",
        "green",
        "orange",
        "black",
        "sky",
        "pink",
        "lime",
      ])
      .optional(),
    idBoard: z.string(),
  })
  .strict();
const outputSchema = z.object({
  id: z
    .string()
    .regex(new RegExp("^[0-9a-fA-F]{24}$"))
    .describe("Trello object id (24 hex chars)."),
  idBoard: z.string(),
  name: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "createLabel",
  title: "Create Label",
  description:
    "Create a label on a board (or add a named label to a card when idCard set).",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "trello",
  run: async (input, ctx) => {
    const url = `https://api.trello.com/1/labels`;
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body["name"] = input.name;
    if (input.color !== undefined) body["color"] = input.color;
    if (input.idBoard !== undefined) body["idBoard"] = input.idBoard;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Trello createLabel ${res.status}: ${errBody}`);
    }
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
