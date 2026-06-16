#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { API_BASE, readDropbox } from "../lib/dropbox.ts";

const inputSchema = z
  .object({
    shared_folder_id: z
      .string()
      .describe("ID of the shared folder. Resolve it via listSharedFolders."),
    member: z
      .string()
      .describe("Email address of the member to remove, e.g. sam@acme.com."),
    leave_a_copy: z
      .boolean()
      .describe(
        "If true, the removed member keeps a copy of the folder's contents after removal. Default false.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  shared_folder_id: z.string(),
  member: z.string().describe("Email of the removed member."),
  removed: z
    .literal(true)
    .describe("True once the removal has completed successfully."),
});

const definition = defineTool({
  name: "removeFolderMember",
  title: "Remove Folder Member",
  description:
    "Remove a member (by email) from a shared folder. Returns once the removal has completed.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "dropbox",
  run: async (input, ctx) => {
    // Initiate the removal. The wire is asynchronous: it returns a LaunchResultBase
    // that is either { ".tag": "complete" } or { ".tag": "async_job_id", async_job_id }.
    const initRes = await ctx.fetch(
      `${API_BASE}/2/sharing/remove_folder_member`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shared_folder_id: input.shared_folder_id,
          member: { ".tag": "email", email: input.member },
          leave_a_copy: input.leave_a_copy ?? false,
        }),
      },
    );
    const launch = await readDropbox<{
      ".tag"?: string;
      async_job_id?: string;
    }>("removeFolderMember", initRes);

    const done = {
      shared_folder_id: input.shared_folder_id,
      member: input.member,
      removed: true as const,
    };

    // Synchronous completion — no job to poll.
    if (launch[".tag"] === "complete" || !launch.async_job_id) return done;

    // Otherwise poll the job to a confirmed outcome — the agent gets a real result,
    // not a dangling job id (there is no listFolderMembers tool to verify against).
    const asyncJobId = launch.async_job_id;
    const MAX_ATTEMPTS = 10;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      await new Promise((r) => setTimeout(r, 1000));
      // Poll the remove-member job status until it reports complete or failed.
      const pollRes = await ctx.fetch(
        `${API_BASE}/2/sharing/check_remove_member_job_status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ async_job_id: asyncJobId }),
        },
      );
      const status = await readDropbox<{
        ".tag"?: string;
        failed?: unknown;
      }>("removeFolderMember", pollRes);
      if (status[".tag"] === "complete") return done;
      if (status[".tag"] === "failed") {
        const reason =
          typeof status.failed === "string"
            ? status.failed
            : JSON.stringify(status.failed);
        throw new Error(
          `Dropbox removeFolderMember failed: ${reason || "unknown reason"}`,
        );
      }
      // any other tag (e.g. in_progress) → keep polling
    }
    throw new Error(
      `Dropbox removeFolderMember did not complete within ${MAX_ATTEMPTS} polls — the job is still running (async_job_id ${asyncJobId}).`,
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
