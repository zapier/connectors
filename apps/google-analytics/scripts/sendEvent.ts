#!/usr/bin/env node
// sendEvent is the one non-standard tool: it targets a different host
// (www.google-analytics.com), authenticates with a per-stream api_secret QUERY
// param rather than the connection's OAuth bearer, and needs conditional
// (XOR + co-requirement) input validation the spec can't express.
import {
  ConnectorHttpError,
  defineTool,
  handleIfScriptMain,
  readResponseBody,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    apiSecret: z
      .string()
      .describe(
        "The data stream's Measurement Protocol secret value. From listMeasurementProtocolSecrets (secretValue), or create one with createMeasurementProtocolSecret.",
      ),
    measurementId: z
      .string()
      .describe(
        "Web stream measurement id, G-XXXXXXX. Provide this OR firebaseAppId (exactly one). From listDataStreams (webStreamData.measurementId). Requires clientId.",
      )
      .optional(),
    firebaseAppId: z
      .string()
      .describe(
        "App stream Firebase App id, e.g. 1:1234567890:android:abc123. Provide this OR measurementId (exactly one). Requires appInstanceId.",
      )
      .optional(),
    clientId: z
      .string()
      .describe(
        "Identifier for a user instance of a web client (the gtag/analytics.js client id). Required when using measurementId (web).",
      )
      .optional(),
    appInstanceId: z
      .string()
      .describe(
        "A Firebase app-instance id. Required when using firebaseAppId (app).",
      )
      .optional(),
    events: z
      .array(
        z
          .object({
            name: z
              .string()
              .describe(
                "Event name, e.g. purchase, sign_up. ≤40 chars, letters/digits/underscores, must start with a letter; the ga_/firebase_/google_ prefixes are reserved. screen_view/ad_impression/in_app_purchase are app-only.",
              ),
            params: z
              .record(z.string(), z.json())
              .describe(
                'Event parameters, e.g. {"value": 9.99, "currency": "USD"}. ≤25 params per event. For revenue events, currency is required whenever value is set.',
              )
              .optional(),
          })
          .strict(),
      )
      .min(1)
      .max(25)
      .describe("1-25 events to send in this request."),
    userId: z
      .string()
      .describe("Optional cross-device/-platform user id you assign.")
      .optional(),
    timestampMicros: z
      .string()
      .describe(
        "Optional event time as unix microseconds (string). Only accepted up to ~72h in the past; omit to stamp now.",
      )
      .optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    const hasMeasurement = val.measurementId !== undefined;
    const hasFirebase = val.firebaseAppId !== undefined;
    if (hasMeasurement === hasFirebase) {
      ctx.addIssue({
        code: "custom",
        message:
          "Provide exactly one of measurementId (web) or firebaseAppId (app).",
      });
    }
    if (hasMeasurement && val.clientId === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["clientId"],
        message: "clientId is required when measurementId is provided.",
      });
    }
    if (hasFirebase && val.appInstanceId === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["appInstanceId"],
        message: "appInstanceId is required when firebaseAppId is provided.",
      });
    }
  });

const outputSchema = z.object({
  success: z
    .boolean()
    .describe(
      "Always true when the request was transmitted. SOFT SUCCESS: /mp/collect does not return HTTP error codes even for malformed or invalid events, so it cannot confirm the event was accepted. Validate payloads against the /debug/mp/collect endpoint (see references).",
    ),
});

const definition = defineTool({
  name: "sendEvent",
  title: "Send Event",
  description:
    "Send one or more events to GA4 via the Measurement Protocol. Authenticates with a data-stream api_secret (from listMeasurementProtocolSecrets), not the OAuth connection. Note: the API does not return errors for invalid events, so it cannot confirm acceptance.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-analytics",
  run: async (input, ctx) => {
    // Credential is the api_secret query param; the stream id is measurement_id
    // (web) or firebase_app_id (app). The OAuth bearer from the connection is
    // attached by the resolver but not used by www.google-analytics.com, which
    // authenticates via api_secret.
    const url = new URL("https://www.google-analytics.com/mp/collect");
    url.searchParams.set("api_secret", input.apiSecret);
    if (input.measurementId !== undefined) {
      url.searchParams.set("measurement_id", input.measurementId);
    }
    if (input.firebaseAppId !== undefined) {
      url.searchParams.set("firebase_app_id", input.firebaseAppId);
    }

    const body: Record<string, unknown> = { events: input.events };
    if (input.clientId !== undefined) body["client_id"] = input.clientId;
    if (input.appInstanceId !== undefined)
      body["app_instance_id"] = input.appInstanceId;
    if (input.userId !== undefined) body["user_id"] = input.userId;
    if (input.timestampMicros !== undefined)
      body["timestamp_micros"] = input.timestampMicros;

    const res = await ctx.fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // /mp/collect returns 2xx (usually 204) with no body even for invalid
    // events; a non-2xx here is a genuine transport/edge failure worth raising.
    // Route it through the SDK error path so the full upstream Response
    // (status, headers, body) rides along on error.response.
    if (!res.ok) {
      const body = await readResponseBody(res);
      throw ConnectorHttpError.fromResponseBody(res, body, {
        message: `Google Analytics sendEvent: unexpected HTTP ${res.status} from /mp/collect (the endpoint normally returns 2xx; check measurement_id/firebaseAppId and api_secret).`,
      });
    }
    return { success: true };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
