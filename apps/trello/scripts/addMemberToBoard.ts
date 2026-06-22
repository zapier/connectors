#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    id: z.string().describe("24-char hex board id."),
    email: z.string().describe("Member email to invite/add."),
    type: z
      .enum(["normal", "admin", "observer"])
      .describe("Membership type.")
      .optional(),
    fullName: z
      .string()
      .describe("Display name when inviting by email.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({ status: z.number() });

const definition = defineTool({
  name: "addMemberToBoard",
  title: "Add Member To Board",
  description: "Add a member to a board by member id or email.",
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
    const url = `https://api.trello.com/1/boards/${encodeURIComponent(input.id)}/memberships`;
    const body: Record<string, unknown> = {};
    if (input.email !== undefined) body["email"] = input.email;
    if (input.type !== undefined) body["type"] = input.type;
    if (input.fullName !== undefined) body["fullName"] = input.fullName;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Trello addMemberToBoard ${res.status}: ${errBody}`);
    }
    return { status: res.status };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
