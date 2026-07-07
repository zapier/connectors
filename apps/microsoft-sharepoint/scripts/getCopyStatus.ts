#!/usr/bin/env node
// This op GETs the opaque monitor URL that copyItem returns at runtime — there
// is no fixed Graph path for it. The monitor URL is pre-authenticated, so it's
// polled with a bare fetch and no auth header.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwGraphError } from "../lib/microsoft-sharepoint.ts";

const inputSchema = z
  .object({
    monitorUrl: z
      .string()
      .url()
      .describe(
        "The monitor URL returned by copyItem. Opaque — pass it verbatim; it isn't reconstructable.",
      ),
  })
  .strict();

const outputSchema = z.object({
  status: z
    .string()
    .describe(
      'Copy status: "notStarted", "inProgress", "completed", or "failed".',
    ),
  percentageComplete: z
    .number()
    .describe("Percent complete (0–100).")
    .optional(),
  resourceId: z
    .string()
    .describe("The copied item's id — present once status is completed.")
    .optional(),
  error: z
    .object({
      code: z.string().describe("Error code.").optional(),
      message: z.string().describe("Error message.").optional(),
    })
    .describe(
      "Present when status is failed, e.g. a nameAlreadyExists conflict.",
    )
    .optional(),
});

const definition = defineTool({
  name: "getCopyStatus",
  title: "Get Copy Status",
  description:
    "Poll the status of an asynchronous copy started by copyItem. Pass the monitorUrl from copyItem; read resourceId (the new item's id) once status is completed.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  // No connection: copyItem's monitor URL is already pre-authenticated, so the
  // poll needs no credential (and sending one is unnecessary).
  run: async (input) => {
    // The monitor URL is pre-authenticated — poll it with a bare fetch.
    const res = await globalThis.fetch(input.monitorUrl);
    // It's still a Graph endpoint on failure, so route the error through the
    // shared handler to capture the full response/body rather than a bare
    // status string (the monitor URL may have expired or be invalid).
    if (!res.ok) await throwGraphError(res);
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
