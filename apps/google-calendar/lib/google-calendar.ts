// Shared Google Calendar schemas and error mapping.
//
// The Event resource is returned by seven tools (createEvent, quickAddEvent,
// getEvent, updateEvent, moveEvent, listEvents, listEventInstances), and the
// EventDateTime / Attendee / Reminders sub-shapes are shared between the
// event-write inputs and the Event output — so the canonical shapes live here
// and every event tool imports them. The error mapper is shared by all tools:
// Google returns the same `{ error: { code, message, errors:[{reason}] } }`
// body across the whole API, and the reason string is what tells an agent
// whether to reconnect, wait, or ask for access.

import { ConnectorHttpError } from "@zapier/connectors-sdk";
import { z } from "zod";

// Field literals are shared between the strip-on-parse OUTPUT schemas (used in
// EventSchema — unknown API fields are dropped, never thrown) and the strict
// INPUT schemas (used by createEvent/updateEvent — a mistyped field fails loudly
// instead of being silently dropped). The connectors-ref validator requires
// input objects to be strict at every level and output objects to strip.

const eventDateTimeFields = {
  date: z
    .string()
    .date()
    .describe(
      "All-day date, YYYY-MM-DD. For all-day events end.date is EXCLUSIVE (the day AFTER the last day — a single all-day event has end.date = start.date + 1).",
    )
    .optional(),
  dateTime: z
    .string()
    .datetime({ offset: true })
    .describe(
      "Timed start/end, RFC3339, e.g. 2026-06-16T09:00:00-07:00. A time zone offset is required unless timeZone is set.",
    )
    .optional(),
  timeZone: z
    .string()
    .describe(
      "IANA timezone id, e.g. America/Los_Angeles. REQUIRED when recurrence is set (an offset alone is rejected for recurring events).",
    )
    .optional(),
};
const eventDateTimeDescription =
  "An event time. All-day = set `date` only; timed = set `dateTime` (and `timeZone` for recurring events). Never set both date and dateTime.";

/** EventDateTime as it appears in API responses (strips unknown keys). */
export const EventDateTimeSchema = z
  .object(eventDateTimeFields)
  .describe(eventDateTimeDescription);
/** EventDateTime for tool input (rejects unknown keys). */
export const EventDateTimeInput = z
  .strictObject(eventDateTimeFields)
  .describe(eventDateTimeDescription);

const attendeeFields = {
  email: z.string().describe("Attendee email address.").optional(),
  displayName: z.string().describe("Attendee display name.").optional(),
  optional: z
    .boolean()
    .describe("Whether the attendee's attendance is optional.")
    .optional(),
  responseStatus: z
    .enum(["needsAction", "declined", "tentative", "accepted"])
    .describe(
      "RSVP state. Only settable for the authenticated user (self); other attendees' statuses are read-only.",
    )
    .optional(),
  organizer: z
    .boolean()
    .describe("Read-only. Whether this attendee is the organizer.")
    .optional(),
  self: z
    .boolean()
    .describe("Read-only. Whether this attendee is the authenticated user.")
    .optional(),
};
/** A guest on an event, as returned in API responses. */
export const AttendeeSchema = z.object(attendeeFields);
/** A guest on an event, for tool input. */
export const AttendeeInput = z.strictObject(attendeeFields);

const reminderOverrideFields = {
  method: z
    .enum(["email", "popup"])
    .describe("Reminder delivery method.")
    .optional(),
  minutes: z
    .number()
    .int()
    .describe(
      "Minutes before the event to fire the reminder (max 40320 = 4 weeks).",
    )
    .optional(),
};
const remindersOverridesDescription =
  "Custom reminders (max 5). Used only when useDefault is false.";
const useDefaultField = z
  .boolean()
  .describe(
    "Use the calendar's default reminders. When true, `overrides` is ignored.",
  )
  .optional();

/** Event reminder configuration, as returned in API responses. */
export const RemindersSchema = z.object({
  useDefault: useDefaultField,
  overrides: z
    .array(z.object(reminderOverrideFields))
    .describe(remindersOverridesDescription)
    .optional(),
});
/** Event reminder configuration, for tool input. */
export const RemindersInput = z.strictObject({
  useDefault: useDefaultField,
  overrides: z
    .array(z.strictObject(reminderOverrideFields))
    .describe(remindersOverridesDescription)
    .optional(),
});

const personSchema = z.object({
  email: z.string().optional(),
  displayName: z.string().optional(),
  self: z.boolean().optional(),
});

const conferenceDataSchema = z
  .object({
    conferenceId: z.string().optional(),
    entryPoints: z
      .array(
        z.object({
          entryPointType: z
            .string()
            .describe('e.g. "video", "phone", "more".')
            .optional(),
          uri: z.string().optional(),
          label: z.string().optional(),
        }),
      )
      .optional(),
    createRequest: z
      .object({
        requestId: z.string().optional(),
        status: z
          .object({
            statusCode: z
              .string()
              .describe('"pending", "success", or "failure".')
              .optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .describe(
    'Conference (Google Meet) data. createRequest.status.statusCode is "pending" until the link resolves; once "success", read the link from entryPoints with entryPointType "video".',
  );

/** The canonical Google Calendar Event resource returned by every event tool. */
export const EventSchema = z
  .object({
    id: z
      .string()
      .describe(
        "Opaque event id. For a recurring occurrence this is the instance id.",
      ),
    status: z
      .enum(["confirmed", "tentative", "cancelled"])
      .describe(
        "confirmed, tentative, or cancelled (cancelled = deleted tombstone).",
      ),
    htmlLink: z
      .string()
      .describe("Link to open the event in the Google Calendar UI.")
      .optional(),
    summary: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    start: EventDateTimeSchema.optional(),
    end: EventDateTimeSchema.optional(),
    recurrence: z.array(z.string()).optional(),
    recurringEventId: z
      .string()
      .describe("For an instance, the id of the recurring master event.")
      .optional(),
    originalStartTime: EventDateTimeSchema.optional(),
    attendees: z.array(AttendeeSchema).optional(),
    organizer: personSchema.describe("The event organizer.").optional(),
    creator: personSchema.describe("The event creator.").optional(),
    reminders: RemindersSchema.optional(),
    conferenceData: conferenceDataSchema.optional(),
    hangoutLink: z
      .string()
      .describe(
        "Legacy Meet link convenience field; prefer conferenceData.entryPoints.",
      )
      .optional(),
    colorId: z
      .string()
      .describe("Event color palette index (resolve via getColors).")
      .optional(),
    visibility: z.string().optional(),
    transparency: z.string().optional(),
    eventType: z.string().optional(),
    guestsCanModify: z.boolean().optional(),
    guestsCanInviteOthers: z.boolean().optional(),
    guestsCanSeeOtherGuests: z.boolean().optional(),
    iCalUID: z
      .string()
      .describe("RFC5545 UID, shared across a recurrence (distinct from id).")
      .optional(),
    created: z.string().datetime({ offset: true }).optional(),
    updated: z.string().datetime({ offset: true }).optional(),
    etag: z.string().optional(),
    kind: z.string().optional(),
  })
  .describe("A calendar event.");

const RATE_LIMIT_REASONS = new Set([
  "rateLimitExceeded",
  "userRateLimitExceeded",
  "quotaExceeded",
]);

interface GoogleErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    errors?: Array<{ domain?: string; reason?: string; message?: string }>;
  };
}

async function readBody(res: Response): Promise<unknown> {
  let text: string;
  try {
    text = await res.text();
  } catch {
    return undefined;
  }
  if (text === "") return "";
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * Throw a ConnectorHttpError with an agent-actionable message on a non-OK
 * Google Calendar response, mapping Google's `reason` strings to the recovery
 * the agent should take (reconnect vs back-off vs ask-for-access). On success
 * the response is returned unchanged so the caller can read the body. Pass the
 * tool name so the message names the failing operation.
 */
export async function throwForGoogleCalendar(
  res: Response,
  toolName: string,
): Promise<Response> {
  if (res.ok) return res;
  const body = await readBody(res);
  const err = (body as GoogleErrorBody | undefined)?.error;
  const reason = err?.errors?.[0]?.reason;
  const apiMessage = err?.message;
  const prefix = `Google Calendar ${toolName} ${res.status}`;

  let message: string;
  if (res.status === 401) {
    message = `${prefix}: invalid or expired credentials. Reconnect Google Calendar.`;
  } else if (res.status === 429 || (reason && RATE_LIMIT_REASONS.has(reason))) {
    message = `${prefix}: ${reason ?? "rateLimitExceeded"} — rate/quota limited. Back off and retry with jitter (no Retry-After is sent).`;
  } else if (res.status === 403 && reason === "insufficientPermissions") {
    message = `${prefix}: insufficientPermissions — reconnect Google Calendar with calendar access (the granted OAuth scope is too narrow).`;
  } else if (res.status === 403) {
    message = `${prefix}: ${reason ?? "forbidden"} — your access role on this calendar is too low (sharing/ACL changes need the owner role). Reconnecting won't help; ask the calendar owner for access.`;
  } else if (res.status === 404) {
    message = `${prefix}: ${reason ?? "notFound"} — ${apiMessage ?? "the calendar or resource does not exist"}. Verify the id (resolve calendars via listCalendars, events via listEvents).`;
  } else {
    message = `${prefix}: ${apiMessage ?? reason ?? "request failed"}`;
  }

  throw ConnectorHttpError.fromResponseBody(res, body, { message });
}
