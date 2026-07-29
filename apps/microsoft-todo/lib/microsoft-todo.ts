// Shared Microsoft Graph To Do request plumbing used across every script: the
// base URL, the default-list ("Tasks" alias) path helper, the OData
// query-param builder (agent-friendly top/filter/orderby -> wire
// $top/$filter/$orderby), the list-envelope normalizer (Graph's
// { value, @odata.nextLink } -> { items, next_cursor }, passing the opaque
// @odata.nextLink through verbatim as next_cursor rather than extracting and
// reconstructing a $skiptoken — Microsoft's own paging guidance warns against
// pulling values out of @odata.nextLink and reusing them in a different
// request), the Graph error mapper, and the shared
// Task/TaskList/ChecklistItem/DateTimeTimeZone output schemas. Lifted here so
// a fix lands in one place instead of drifting across 16 scripts.

import { ConnectorHttpError, readResponseBody } from "@zapier/connectors-sdk";
import { z } from "zod";

/** The Microsoft Graph v1.0 endpoint. */
export const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/**
 * The {listId} path segment for a task-collection endpoint (createTask,
 * listTasks, findTask). listId is optional on those three tools: omitting it
 * targets the built-in "Tasks" well-known alias as a default-list shortcut.
 * The alias isn't guaranteed to work on single-item task or checklist
 * endpoints (see references/microsoft-todo-api-gotchas.md#task-lists-todotasklist
 * for a documented single-item failure case), so those tools require a real
 * listId and encodeURIComponent it directly instead of calling this helper.
 */
export function listPathSegment(listId?: string): string {
  return listId ? encodeURIComponent(listId) : "Tasks";
}

/**
 * Build the OData query string for the first page of a list call from the
 * connector's agent-friendly param names ($top/$filter/$orderby are the wire
 * names Graph expects; the tool surface exposes top/filter/orderby). Only
 * used for the first request — a follow-up page is fetched by refetching
 * `next_cursor` (the full `@odata.nextLink`) verbatim instead.
 */
export function buildListQuery(params: {
  top?: number;
  filter?: string;
  orderby?: string;
}): string {
  const sp = new URLSearchParams();
  if (params.top !== undefined) sp.set("$top", String(params.top));
  if (params.filter !== undefined) sp.set("$filter", params.filter);
  if (params.orderby !== undefined) sp.set("$orderby", params.orderby);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Normalize a Graph list response ({ value, @odata.nextLink }) into the
 * connector's { items, next_cursor } shape. next_cursor is the full,
 * opaque @odata.nextLink URL, passed through verbatim — Microsoft's paging
 * guidance is to refetch that link as-is rather than extract a $skiptoken
 * and reconstruct a request from it. Absent when there is no further page.
 */
export function toListResult<T>(payload: unknown): {
  items: T[];
  next_cursor?: string;
} {
  const p = (payload ?? {}) as { value?: T[]; "@odata.nextLink"?: string };
  const nextLink = p["@odata.nextLink"];
  return {
    items: p.value ?? [],
    ...(nextLink ? { next_cursor: nextLink } : {}),
  };
}

interface GraphErrorBody {
  error?: {
    code?: string;
    message?: string;
    innerError?: { code?: string };
  };
}

/**
 * Turn a non-2xx Graph response into a ConnectorHttpError whose message names
 * the failing tool plus an actionable recovery hint for the To Do-specific
 * cases that have one. The full Response (status, headers, raw body) always
 * rides along on error.response via fromResponseBody — the hint below is only
 * the human-readable summary layered on top.
 */
export async function throwGraphError(
  res: Response,
  toolName: string,
): Promise<never> {
  const body = await readResponseBody(res);
  const parsed = body as GraphErrorBody;
  // Graph reports ErrorInvalidIdMalformed nested under error.innerError.code,
  // not error.code (confirmed via a live getTask call with a malformed
  // taskId, which came back 400 with this exact shape) — check both.
  const code = parsed?.error?.code ?? "";
  const innerCode = parsed?.error?.innerError?.code ?? "";
  const detail = parsed?.error?.message ?? res.statusText;
  const prefix = `Microsoft To Do ${toolName}`;

  let hint = detail;
  if (
    res.status === 404 ||
    code === "ErrorInvalidIdMalformed" ||
    innerCode === "ErrorInvalidIdMalformed"
  ) {
    hint = `${detail} — the listId or taskId is invalid, stale, or malformed. A task's id changes when it moves to another list; re-resolve it via listLists/listTasks/findTask and retry.`;
  } else if (res.status === 403) {
    hint = `${detail} — reconnect your Microsoft To Do account and grant Tasks.ReadWrite.`;
  } else if (res.status === 401) {
    hint = `${detail} — the access token is invalid or expired; reconnect your Microsoft To Do account.`;
  } else if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    hint = `${detail} — throttled by Microsoft Graph${retryAfter ? `; retry after ${retryAfter}s` : ""}.`;
  }

  throw ConnectorHttpError.fromResponseBody(res, body, {
    message: `${prefix}: ${hint}`,
  });
}

/**
 * Make an authed Graph request. `fetch` is the connection-injected
 * `ctx.fetch`. Sets Content-Type: application/json for JSON bodies, throws a
 * mapped ConnectorHttpError on non-2xx (via throwGraphError), and returns the
 * raw Response so the caller parses it into the tool's output shape.
 */
export async function todoFetch(
  fetch: typeof globalThis.fetch,
  toolName: string,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) await throwGraphError(res, toolName);
  return res;
}

// — Shared output schemas —
// All plain z.object()s: unknown keys the Graph API adds later are stripped
// on parse, so the agent sees only the canonical fields pinned here.

/** A Graph date-time: a naive local timestamp plus its time zone. */
export const dateTimeTimeZoneSchema = z.object({
  dateTime: z
    .string()
    .describe('Local date/time, e.g. "2026-07-01T09:00:00" (no Z, no offset).'),
  timeZone: z
    .string()
    .describe(
      'IANA (e.g. "America/New_York"), Windows (e.g. "Pacific Standard Time"), or "UTC" zone name. For dueDateTime/startDateTime specifically, the time-of-day portion may not round-trip exactly as sent (a documented Graph quirk) — read the value back to confirm rather than assuming it matches what you sent.',
    ),
});

/** A task's note/body: plain text (recommended) or html. */
export const itemBodySchema = z.object({
  content: z.string().nullable().describe("The note text.").optional(),
  contentType: z
    .enum(["text", "html"])
    .nullable()
    .describe("text (default, recommended) or html.")
    .optional(),
});

/**
 * The canonical Task shape every Task-returning tool agrees on (createTask,
 * getTask, updateTask, completeTask singles; listTasks/findTask items).
 */
export const taskSchema = z.object({
  id: z
    .string()
    .describe(
      "Task id. Changes if the task is moved to another list — not a durable cross-list key.",
    ),
  title: z.string().describe("Title of the task."),
  body: itemBodySchema
    .nullable()
    .describe("A task's note/body. contentType is text or html.")
    .optional(),
  importance: z
    .enum(["low", "normal", "high"])
    .nullable()
    .describe("low, normal, or high.")
    .optional(),
  status: z
    .enum([
      "notStarted",
      "inProgress",
      "completed",
      "waitingOnOthers",
      "deferred",
    ])
    .describe("Current status."),
  isReminderOn: z
    .boolean()
    .nullable()
    .describe("Whether a reminder is enabled.")
    .optional(),
  dueDateTime: dateTimeTimeZoneSchema
    .nullable()
    .describe(
      "A date/time with its time zone. dateTime is a naive local timestamp with no trailing Z or offset; timeZone names the zone.",
    )
    .optional(),
  reminderDateTime: dateTimeTimeZoneSchema
    .nullable()
    .describe(
      "A date/time with its time zone. dateTime is a naive local timestamp with no trailing Z or offset; timeZone names the zone.",
    )
    .optional(),
  startDateTime: dateTimeTimeZoneSchema
    .nullable()
    .describe(
      "A date/time with its time zone. dateTime is a naive local timestamp with no trailing Z or offset; timeZone names the zone.",
    )
    .optional(),
  completedDateTime: dateTimeTimeZoneSchema
    .nullable()
    .describe("When the task was completed; absent when not completed.")
    .optional(),
  createdDateTime: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .describe("When the task was created (RFC3339, UTC). Read-only.")
    .optional(),
  lastModifiedDateTime: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .describe("When the task was last modified (RFC3339, UTC). Read-only.")
    .optional(),
  categories: z
    .array(z.string())
    .nullable()
    .describe("Category names applied to the task.")
    .optional(),
});

/** The canonical TaskList shape every list-returning tool agrees on. */
export const taskListSchema = z.object({
  id: z.string().describe("Task-list id. Pass as listId on task calls."),
  displayName: z.string().describe("Name of the task list."),
  wellknownListName: z
    .enum(["none", "defaultList", "flaggedEmails"])
    .nullable()
    .describe(
      "none for user-created lists; defaultList marks the built-in Tasks list; flaggedEmails the flagged-email list.",
    )
    .optional(),
  isOwner: z
    .boolean()
    .nullable()
    .describe("True if the signed-in user owns the list.")
    .optional(),
  isShared: z
    .boolean()
    .nullable()
    .describe("True if the list is shared with others.")
    .optional(),
});

/** The canonical checklist-item (step) shape every step tool agrees on. */
export const checklistItemSchema = z.object({
  id: z.string().describe("Checklist-item id."),
  displayName: z.string().describe("The step text."),
  isChecked: z.boolean().describe("Whether the step is checked off."),
  createdDateTime: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .describe("When the step was created (RFC3339, UTC). Read-only.")
    .optional(),
  checkedDateTime: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .describe(
      "When the step was checked off (RFC3339, UTC). Read-only; absent when not checked.",
    )
    .optional(),
});

/** Confirmation shape for a delete op whose HTTP response carries no body. */
export const successResponseSchema = z.object({
  success: z.literal(true),
});
