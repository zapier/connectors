#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { DEFAULT_ROW_LIMIT, searchGaql } from "../lib/googleAdsFetch.ts";

const inputSchema = z
  .object({
    customerId: z
      .string()
      .describe(
        "Operating account id, digits only. From listAccessibleCustomers or listCustomerClients.",
      ),
    limit: z
      .number()
      .int()
      .positive()
      .describe(
        `Maximum rows to return. Defaults to ${DEFAULT_ROW_LIMIT}. A soft cap — raise it or page via pageToken for more.`,
      )
      .optional(),
    pageToken: z
      .string()
      .describe(
        "Cursor from a prior response's next_page_token; omit for the first page.",
      )
      .optional(),
    loginCustomerId: z
      .string()
      .describe(
        "Manager (MCC) account id, digits only. Required only when the operating account is reached through a manager account; omit for direct access.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.string().describe("Conversion action id."),
        name: z.string().describe("Conversion action name.").optional(),
        status: z.string().describe("ENABLED, REMOVED, or HIDDEN.").optional(),
        type: z
          .string()
          .describe("Conversion type, e.g. UPLOAD_CLICKS, WEBPAGE, AD_CALL.")
          .optional(),
        category: z
          .string()
          .describe(
            "Conversion category, e.g. DEFAULT, PURCHASE, LEAD, SIGNUP.",
          )
          .optional(),
        resource_name: z
          .string()
          .describe("Full conversion action resource name.")
          .optional(),
      }),
    )
    .describe("Conversion actions configured on the account."),
  next_page_token: z
    .string()
    .describe("Pass as pageToken to fetch the next page; absent when no more.")
    .optional(),
});

interface ConversionActionRow {
  conversionAction?: {
    id?: string;
    name?: string;
    status?: string;
    type?: string;
    category?: string;
    resourceName?: string;
  };
}

const definition = defineTool({
  name: "listConversionActions",
  title: "List Conversion Actions",
  description:
    "List the conversion actions configured on the account. Use to find or verify a conversion action before creating a duplicate with createConversionAction.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-ads",
  run: async (input, ctx) => {
    const query =
      "SELECT conversion_action.id, conversion_action.name, conversion_action.status, " +
      "conversion_action.type, conversion_action.category FROM conversion_action" +
      ` LIMIT ${input.limit ?? DEFAULT_ROW_LIMIT}`;
    const { results, nextPageToken } = await searchGaql(ctx.fetch, {
      customerId: input.customerId,
      query,
      pageToken: input.pageToken,
      loginCustomerId: input.loginCustomerId,
      toolName: "listConversionActions",
    });
    return {
      results: (results as ConversionActionRow[]).map((row) => {
        const c = row.conversionAction ?? {};
        return {
          id: c.id ?? "",
          name: c.name,
          status: c.status,
          type: c.type,
          category: c.category,
          resource_name: c.resourceName,
        };
      }),
      next_page_token: nextPageToken,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
