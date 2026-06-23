#!/usr/bin/env node
// Authored by the implementation agent: codegen scaffolds the single POST, but
// YouTube returns subscriptionDuplicate when the user is already subscribed —
// a postcondition-satisfied "soft success". We catch it and look up the existing
// subscription so the tool still returns a valid Subscription (with the id the
// agent needs) rather than throwing on a state it actually wanted.
import {
  ConnectorHttpError,
  defineTool,
  handleIfScriptMain,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  hasYouTubeReason,
  SubscriptionSchema,
  throwForYouTube,
} from "../lib/youtube.ts";

const inputSchema = z
  .object({
    snippet: z
      .object({
        resourceId: z
          .object({
            kind: z.string().default("youtube#channel"),
            channelId: z
              .string()
              .describe("The id (UC...) of the channel to subscribe to."),
          })
          .strict()
          .describe(
            "The channel to subscribe to. Set kind to youtube#channel and channelId to the target channel id.",
          ),
      })
      .strict(),
    part: z
      .string()
      .describe("Resource parts being written. Leave as the default.")
      .default("snippet"),
  })
  .strict();

const outputSchema = SubscriptionSchema.extend({
  alreadySatisfied: z
    .literal(true)
    .describe("Present and true when the user was already subscribed.")
    .optional(),
  alreadySatisfiedReason: z
    .string()
    .describe('The upstream code, e.g. "subscriptionDuplicate".')
    .optional(),
});

const definition = defineTool({
  name: "subscribeToChannel",
  title: "Subscribe To Channel",
  description:
    "Subscribe the authenticated user to a channel. Returns the subscription id (used by unsubscribeFromChannel — distinct from the channel id). If the user is already subscribed, returns the existing subscription with alreadySatisfied: true rather than failing.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "youtube",
  run: async (input, ctx) => {
    const url = new URL(`https://www.googleapis.com/youtube/v3/subscriptions`);
    url.searchParams.set("part", input.part);

    const res = await ctx.fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snippet: input.snippet }),
    });
    if (res.ok) return res.json();

    // Soft-success: already subscribed → look up the existing subscription so we
    // can return its id, flagged with alreadySatisfied.
    if (res.status === 400) {
      const body = (await res.json().catch(() => null)) as unknown;
      if (hasYouTubeReason(body, "subscriptionDuplicate")) {
        const channelId = input.snippet.resourceId.channelId;
        const lookup = new URL(
          `https://www.googleapis.com/youtube/v3/subscriptions`,
        );
        lookup.searchParams.set("part", "snippet,contentDetails");
        lookup.searchParams.set("mine", "true");
        lookup.searchParams.set("forChannelId", channelId);
        const lres = await ctx.fetch(lookup.toString(), { method: "GET" });
        await throwForYouTube(lres, "subscribeToChannel");
        const lpayload = (await lres.json()) as {
          items?: Array<Record<string, unknown>>;
        };
        const existing = lpayload.items?.[0];
        if (existing) {
          return {
            ...existing,
            alreadySatisfied: true as const,
            alreadySatisfiedReason: "subscriptionDuplicate",
          };
        }
      }
      throw ConnectorHttpError.fromResponseBody(res, body, {
        message: `YouTube subscribeToChannel 400: ${
          (body as { error?: { message?: string } })?.error?.message ??
          "bad request"
        }`,
      });
    }

    await throwForYouTube(res, "subscribeToChannel");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
