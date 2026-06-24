#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { googleAdsRequest } from "../lib/googleAdsFetch.ts";

const inputSchema = z.object({}).strict();

const outputSchema = z.object({
  resource_names: z
    .array(z.string())
    .describe(
      "Resource names like customers/1234567890. The trailing digits are the customer id passed to other tools.",
    ),
});

const definition = defineTool({
  name: "listAccessibleCustomers",
  title: "List Accessible Customers",
  description:
    "List the resource names of every Google Ads account the authenticated user can directly access. The entry point for resolving which customer id to operate on; for child accounts under a manager, follow with listCustomerClients.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-ads",
  run: async (_input, ctx) => {
    const json = await googleAdsRequest<{ resourceNames?: string[] }>(
      ctx.fetch,
      {
        path: "/customers:listAccessibleCustomers",
        method: "GET",
        toolName: "listAccessibleCustomers",
      },
    );
    return { resource_names: json.resourceNames ?? [] };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
