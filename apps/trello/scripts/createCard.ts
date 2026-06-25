#!/usr/bin/env node
// Authored by the implementation agent: multi-step card create (POST /cards + optional
// member/label/attachment/checklist/custom-field follow-ups) — outside codegen's single-call model.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  TRELLO_BASE,
  TRELLO_ID_REGEX,
  trelloError,
  trelloFormBody,
  trelloFormHeaders,
} from "../lib/trello.ts";

const cardOutputSchema = z.object({
  id: z.string().regex(TRELLO_ID_REGEX),
  idShort: z.number().int().nullable().optional(),
  name: z.string(),
  desc: z.string().nullable().optional(),
  idBoard: z.string(),
  idList: z.string(),
  shortUrl: z.string().nullable().optional(),
  url: z.string(),
  due: z.union([z.string().datetime({ offset: true }), z.null()]).optional(),
  start: z.union([z.string().datetime({ offset: true }), z.null()]).optional(),
  closed: z.boolean(),
  idMembers: z.array(z.string()).optional(),
  idLabels: z.array(z.string()).optional(),
  labels: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().nullable().optional(),
        color: z.string().nullable().optional(),
      }),
    )
    .optional(),
  dateLastActivity: z.string().datetime({ offset: true }).nullable().optional(),
  customFields: z.record(z.string(), z.json()).optional(),
});

const inputSchema = z
  .object({
    idList: z
      .string()
      .describe("Destination list id. Resolve via listLists or findList."),
    name: z.string().describe("Card title."),
    desc: z.string().describe("Card description (Trello Markdown).").optional(),
    pos: z
      .union([z.enum(["top", "bottom"]), z.number()])
      .describe("Position in the destination list.")
      .optional(),
    due: z.string().datetime({ offset: true }).optional(),
    start: z.string().datetime({ offset: true }).optional(),
    idMembers: z
      .array(z.string())
      .describe("Member ids to assign. Resolve via listBoardMembers.")
      .optional(),
    idLabels: z
      .array(z.string())
      .describe("Label ids to add. Resolve via listLabels or findLabel.")
      .optional(),
    attachmentUrl: z
      .string()
      .url()
      .describe("URL attachment to add after create.")
      .optional(),
    attachmentFileUrl: z
      .string()
      .url()
      .describe("Remote file URL to fetch and upload as attachment.")
      .optional(),
    checklistName: z
      .string()
      .describe("Create a checklist with this name after card create.")
      .optional(),
    checklistItems: z
      .array(z.string())
      .describe("Checklist item names for the new checklist.")
      .optional(),
    customFieldValues: z
      .record(z.string(), z.json())
      .describe(
        "Custom field values keyed by field name. Resolve names via listCustomFields.",
      )
      .optional(),
    address: z.string().optional(),
    coordinates: z.string().describe("latitude,longitude").optional(),
    locationName: z.string().optional(),
  })
  .strict();

const definition = defineTool({
  name: "createCard",
  title: "Create Card",
  description:
    "Create a card on a list with optional members, labels, attachments, checklist, and custom fields. Resolve idList via listLists or findList first.",
  inputSchema,
  outputSchema: cardOutputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "trello",
  run: async (input, ctx) => {
    const createFields: Record<string, string | number> = {
      name: input.name,
      idList: input.idList,
    };
    if (input.desc !== undefined)
      createFields.desc = input.desc.slice(0, 16383);
    if (input.pos !== undefined) createFields.pos = input.pos;
    if (input.due !== undefined) createFields.due = input.due;
    if (input.start !== undefined) createFields.start = input.start;
    if (input.address !== undefined) createFields.address = input.address;
    if (input.coordinates !== undefined)
      createFields.coordinates = input.coordinates;
    if (input.locationName !== undefined)
      createFields.locationName = input.locationName;
    if (input.idLabels?.length)
      createFields.idLabels = input.idLabels.join(",");

    const createRes = await ctx.fetch(`${TRELLO_BASE}/cards`, {
      method: "POST",
      headers: trelloFormHeaders,
      body: trelloFormBody(createFields),
    });
    if (!createRes.ok) await trelloError("createCard", createRes);
    let card = (await createRes.json()) as z.infer<typeof cardOutputSchema>;
    const cardId = card.id;

    if (input.idMembers?.length) {
      for (const memberId of input.idMembers) {
        const memberRes = await ctx.fetch(
          `${TRELLO_BASE}/cards/${cardId}/idMembers`,
          {
            method: "POST",
            headers: trelloFormHeaders,
            body: trelloFormBody({ value: memberId }),
          },
        );
        if (!memberRes.ok) await trelloError("createCard", memberRes);
      }
    }

    const attachUrl = input.attachmentUrl ?? input.attachmentFileUrl;
    if (attachUrl) {
      if (input.attachmentFileUrl) {
        const fileRes = await ctx.fetch(input.attachmentFileUrl);
        if (!fileRes.ok) await trelloError("createCard", fileRes);
        const buffer = await fileRes.arrayBuffer();
        const form = new FormData();
        form.append("file", new Blob([buffer]), "attachment");
        form.append("name", "attachment");
        const uploadRes = await ctx.fetch(
          `${TRELLO_BASE}/cards/${cardId}/attachments`,
          { method: "POST", body: form },
        );
        if (!uploadRes.ok) await trelloError("createCard", uploadRes);
      } else {
        const urlRes = await ctx.fetch(
          `${TRELLO_BASE}/cards/${cardId}/attachments`,
          {
            method: "POST",
            headers: trelloFormHeaders,
            body: trelloFormBody({ url: attachUrl, name: attachUrl }),
          },
        );
        if (!urlRes.ok) await trelloError("createCard", urlRes);
      }
    }

    if (input.checklistName) {
      const checklistRes = await ctx.fetch(`${TRELLO_BASE}/checklists`, {
        method: "POST",
        headers: trelloFormHeaders,
        body: trelloFormBody({
          idCard: cardId,
          name: input.checklistName,
        }),
      });
      if (!checklistRes.ok) await trelloError("createCard", checklistRes);
      const checklist = (await checklistRes.json()) as { id: string };
      if (input.checklistItems?.length) {
        for (const itemName of input.checklistItems) {
          const itemRes = await ctx.fetch(
            `${TRELLO_BASE}/checklists/${checklist.id}/checkItems`,
            {
              method: "POST",
              headers: trelloFormHeaders,
              body: trelloFormBody({ name: itemName }),
            },
          );
          if (!itemRes.ok) await trelloError("createCard", itemRes);
        }
      }
    }

    if (
      input.customFieldValues &&
      Object.keys(input.customFieldValues).length
    ) {
      const boardId = card.idBoard;
      const fieldsRes = await ctx.fetch(
        `${TRELLO_BASE}/boards/${boardId}/customFields`,
      );
      if (!fieldsRes.ok) await trelloError("createCard", fieldsRes);
      const fields = (await fieldsRes.json()) as Array<{
        id: string;
        name: string;
        type: string;
      }>;
      const byName = new Map(fields.map((f) => [f.name, f]));
      for (const [fieldName, rawValue] of Object.entries(
        input.customFieldValues,
      )) {
        const field = byName.get(fieldName);
        if (!field) {
          throw new Error(
            `Trello createCard: unknown custom field "${fieldName}". Resolve via listCustomFields.`,
          );
        }
        let itemValue: Record<string, unknown> = {};
        switch (field.type) {
          case "checkbox":
            itemValue = { checked: Boolean(rawValue) ? "true" : "false" };
            break;
          case "date":
            itemValue = { date: String(rawValue) };
            break;
          case "number":
            itemValue = { number: String(rawValue) };
            break;
          case "list": {
            itemValue = { idValue: String(rawValue) };
            break;
          }
          default:
            itemValue = { text: String(rawValue) };
        }
        const cfRes = await ctx.fetch(
          `${TRELLO_BASE}/cards/${cardId}/customField/${field.id}/item`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value: itemValue }),
          },
        );
        if (!cfRes.ok) await trelloError("createCard", cfRes);
      }
    }

    const refreshRes = await ctx.fetch(`${TRELLO_BASE}/cards/${cardId}`);
    if (refreshRes.ok) {
      card = (await refreshRes.json()) as z.infer<typeof cardOutputSchema>;
    }
    return card;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
