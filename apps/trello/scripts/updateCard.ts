#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    id: z.string().describe("24-char hex card id."),
    name: z.string().optional(),
    desc: z
      .string()
      .describe(
        "Card description (Trello Markdown). Append vs overwrite controlled by descOverwrite.",
      )
      .optional(),
    descOverwrite: z
      .boolean()
      .describe("When false, append desc to existing; when true, replace.")
      .optional(),
    due: z
      .string()
      .datetime({ offset: true })
      .describe("Due datetime (ISO 8601). Pass null string to clear.")
      .optional(),
    start: z
      .string()
      .datetime({ offset: true })
      .describe("Start datetime. Pass null string to clear.")
      .optional(),
    dueComplete: z.boolean().optional(),
    closed: z
      .boolean()
      .describe("Set true to archive the card (archiveCard tool behavior).")
      .optional(),
    idList: z
      .string()
      .describe("Move card to this list id (moveCard tool behavior).")
      .optional(),
    idBoard: z
      .string()
      .describe("Destination board when moving across boards.")
      .optional(),
    pos: z
      .any()
      .superRefine((x, ctx) => {
        const schemas = [z.enum(["top", "bottom"]), z.number()];
        const { errors, failed } = schemas.reduce<{
          errors: z.core.$ZodIssue[];
          failed: number;
        }>(
          ({ errors, failed }, schema) =>
            ((result) =>
              result.error
                ? {
                    errors: [...errors, ...result.error.issues],
                    failed: failed + 1,
                  }
                : { errors, failed })(schema.safeParse(x)),
          { errors: [], failed: 0 },
        );
        const passed = schemas.length - failed;
        if (passed !== 1) {
          ctx.addIssue(
            errors.length
              ? {
                  path: [],
                  code: "invalid_union",
                  errors: [errors],
                  message:
                    "Invalid input: Should pass single schema. Passed " +
                    passed,
                }
              : {
                  path: [],
                  code: "custom",
                  errors: [errors],
                  message:
                    "Invalid input: Should pass single schema. Passed " +
                    passed,
                },
          );
        }
      })
      .optional(),
    address: z.string().optional(),
    locationName: z.string().optional(),
    coordinates: z
      .string()
      .describe("latitude,longitude e.g. 40.712776,-74.005974")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  id: z
    .string()
    .regex(new RegExp("^[0-9a-fA-F]{24}$"))
    .describe("Trello object id (24 hex chars)."),
  name: z.string(),
  desc: z.string().nullable().optional(),
  closed: z.boolean().nullable().optional(),
  idBoard: z.string(),
  idList: z.string(),
  idShort: z.number().int().nullable().optional(),
  shortLink: z.string().nullable().optional(),
  shortUrl: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  due: z.union([z.string().datetime({ offset: true }), z.null()]).optional(),
  dueComplete: z.boolean().nullable().optional(),
  dateLastActivity: z.string().datetime({ offset: true }).nullable().optional(),
  idLabels: z.array(z.string()).nullable().optional(),
  idMembers: z.array(z.string()).nullable().optional(),
  labels: z
    .array(
      z.object({
        id: z
          .string()
          .regex(new RegExp("^[0-9a-fA-F]{24}$"))
          .describe("Trello object id (24 hex chars)."),
        idBoard: z.string(),
        name: z.string().nullable().optional(),
        color: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
  pos: z.number().nullable().optional(),
  customFields: z
    .record(z.string(), z.any())
    .nullable()
    .describe("Custom field values keyed by field name when requested.")
    .optional(),
});

const definition = defineTool({
  name: "updateCard",
  title: "Update Card",
  description:
    "Update card fields (name, description, due, cover, list, archive). Custom fields updated separately in run() polish.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "trello",
  run: async (input, ctx) => {
    const url = `https://api.trello.com/1/cards/${encodeURIComponent(input.id)}`;
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body["name"] = input.name;
    if (input.desc !== undefined) body["desc"] = input.desc;
    if (input.descOverwrite !== undefined)
      body["descOverwrite"] = input.descOverwrite;
    if (input.due !== undefined) body["due"] = input.due;
    if (input.start !== undefined) body["start"] = input.start;
    if (input.dueComplete !== undefined)
      body["dueComplete"] = input.dueComplete;
    if (input.closed !== undefined) body["closed"] = input.closed;
    if (input.idList !== undefined) body["idList"] = input.idList;
    if (input.idBoard !== undefined) body["idBoard"] = input.idBoard;
    if (input.pos !== undefined) body["pos"] = input.pos;
    if (input.address !== undefined) body["address"] = input.address;
    if (input.locationName !== undefined)
      body["locationName"] = input.locationName;
    if (input.coordinates !== undefined)
      body["coordinates"] = input.coordinates;
    const res = await ctx.fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Trello updateCard ${res.status}: ${errBody}`);
    }
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
