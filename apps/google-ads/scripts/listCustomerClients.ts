#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { searchGaql } from "../lib/googleAdsFetch.ts";

const inputSchema = z
  .object({
    customerId: z
      .string()
      .describe(
        "Manager account id, digits only. The accounts beneath this manager are returned. From listAccessibleCustomers.",
      ),
    includeManager: z
      .boolean()
      .describe(
        "Include manager accounts in the results. Defaults to false (operating accounts only).",
      )
      .optional(),
    pageToken: z
      .string()
      .describe(
        "Cursor from a prior response's next_page_token; omit for the first page.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.string().describe("Client (operating) account id, digits only."),
        descriptive_name: z
          .string()
          .describe("Account display name.")
          .optional(),
        manager: z
          .boolean()
          .describe("True if this account is itself a manager account.")
          .optional(),
        level: z
          .string()
          .describe(
            "Distance from the manager in the hierarchy (0 = the manager itself).",
          )
          .optional(),
        currency_code: z
          .string()
          .describe("Account currency, ISO 4217.")
          .optional(),
        time_zone: z.string().describe("Account time zone.").optional(),
        resource_name: z
          .string()
          .describe("Full customer_client resource name.")
          .optional(),
      }),
    )
    .describe("Accounts beneath the manager account."),
  next_page_token: z
    .string()
    .describe("Pass as pageToken to fetch the next page; absent when no more.")
    .optional(),
});

interface CustomerClientRow {
  customerClient?: {
    id?: string;
    descriptiveName?: string;
    manager?: boolean;
    level?: string;
    currencyCode?: string;
    timeZone?: string;
    resourceName?: string;
  };
}

const definition = defineTool({
  name: "listCustomerClients",
  title: "List Customer Clients",
  description:
    "List the client (operating) accounts beneath a manager account. Use after listAccessibleCustomers when the user's access is through a manager (MCC) account, to find the operating customer id to act on.",
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
    const filters = ["customer_client.hidden = false"];
    if (!input.includeManager) filters.push("customer_client.manager = false");
    const query =
      "SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager, " +
      "customer_client.level, customer_client.currency_code, customer_client.time_zone " +
      `FROM customer_client WHERE ${filters.join(" AND ")}`;
    const { results, nextPageToken } = await searchGaql(ctx.fetch, {
      customerId: input.customerId,
      query,
      pageToken: input.pageToken,
      loginCustomerId: input.customerId,
      toolName: "listCustomerClients",
    });
    return {
      results: (results as CustomerClientRow[]).map((row) => {
        const c = row.customerClient ?? {};
        return {
          id: c.id ?? "",
          descriptive_name: c.descriptiveName,
          manager: c.manager,
          level: c.level,
          currency_code: c.currencyCode,
          time_zone: c.timeZone,
          resource_name: c.resourceName,
        };
      }),
      next_page_token: nextPageToken,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
