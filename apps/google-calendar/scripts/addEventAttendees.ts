#!/usr/bin/env node
// Authored by the implementation agent: codegen only scaffolds single-HTTP-call
// ops, but inviting a guest WITHOUT clobbering the existing roster is a
// read-modify-write — fetch the event (events.get), union the new emails into
// its current attendees, then write it back (events.patch). A naive one-shot
// PATCH would replace the whole attendee array, so this can't be a codegen op.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { EventSchema, throwForGoogleCalendar } from "../lib/google-calendar.ts";

const inputSchema = z
  .object({
    calendarId: z
      .string()
      .describe(
        'Calendar holding the event. "primary" or an id from listCalendars.',
      ),
    eventId: z.string().describe("Event id from listEvents or getEvent."),
    attendees: z
      .array(z.string())
      .min(1)
      .describe(
        "Email addresses to invite. Added to the existing attendee list — existing guests are NOT removed.",
      ),
    sendUpdates: z
      .enum(["all", "externalOnly", "none"])
      .describe(
        'Who to notify of the new invites. Defaults to "all" (every guest notified). Override with "externalOnly" (non-Google guests only) or "none" to stay silent.',
      )
      .default("all"),
  })
  .strict();

const definition = defineTool({
  name: "addEventAttendees",
  title: "Add Event Attendees",
  description:
    "Invite one or more people to an existing event WITHOUT removing the current attendees. Safe additive counterpart to updateEvent (which replaces the whole attendee list). Resolve eventId via listEvents/getEvent.",
  inputSchema,
  outputSchema: EventSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    // Adding the same email twice is deduped, so the write is arguably
    // idempotent — but inviting people is an observable side effect, so false.
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-calendar",
  run: async (input, ctx) => {
    // 1. Read the current event so we can merge into its existing roster
    // rather than replacing it (a bare PATCH of `attendees` would wipe it).
    const eventUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`;
    const getRes = await ctx.fetch(eventUrl, { method: "GET" });
    await throwForGoogleCalendar(getRes, "addEventAttendees");
    const event = (await getRes.json()) as {
      attendees?: Array<{ email?: string }>;
    };

    // 2. Union the new emails into the existing attendees, case-insensitive on
    // email. Existing attendee objects are preserved verbatim (responseStatus,
    // displayName, organizer flags, etc.); a new email is appended only when it
    // is not already present.
    const existing = event.attendees ?? [];
    const seen = new Set(
      existing.map((a) => a.email?.toLowerCase()).filter(Boolean),
    );
    const merged = [...existing];
    for (const email of input.attendees) {
      const key = email.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({ email });
      }
    }

    // 3. Write the merged roster back. PATCH so only `attendees` is touched;
    // sendUpdates controls who gets the invite notification.
    const patchUrl = new URL(eventUrl);
    patchUrl.searchParams.set("sendUpdates", input.sendUpdates);
    const patchRes = await ctx.fetch(patchUrl.toString(), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendees: merged }),
    });
    await throwForGoogleCalendar(patchRes, "addEventAttendees");
    return patchRes.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
