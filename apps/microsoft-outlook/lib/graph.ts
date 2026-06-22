// Shared Microsoft Graph request plumbing used by every script: the base URL,
// the mailbox/calendar path roots that thread the optional `mailbox` and
// `calendarId` inputs, the OData query-param builder (agent-friendly
// limit/search/filter → wire $top/$search/$filter), the list-envelope
// normalizer (Graph's { value, @odata.nextLink } → { items, next_cursor }),
// and the error mapper that turns a Graph error body into an actionable
// message. Lifted here so a fix lands in one place instead of 30 scripts.

/** The Microsoft Graph v1.0 endpoint. */
export const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/**
 * The resource root for a mailbox: the signed-in user (`/me`) by default, or a
 * shared mailbox (`/users/{upn}`) when a `mailbox` address is supplied. The
 * `.Shared` delegated scopes plus Exchange-side delegation must be in place for
 * the shared path to succeed.
 */
export function mailboxRoot(mailbox?: string): string {
  return mailbox ? `/users/${encodeURIComponent(mailbox)}` : "/me";
}

/**
 * The path prefix for calendar event operations under a mailbox: the default
 * calendar (`/me`) when `calendarId` is omitted, or a specific calendar
 * (`/me/calendars/{id}`) when supplied. Append `/events`, `/calendarView`, or
 * `/events/{id}` to the result.
 */
export function calendarRoot(mailbox?: string, calendarId?: string): string {
  const base = mailboxRoot(mailbox);
  return calendarId
    ? `${base}/calendars/${encodeURIComponent(calendarId)}`
    : base;
}

/**
 * Build the OData query string for a list/search call from the connector's
 * agent-friendly param names. `search` is wrapped in the quotes Graph's KQL
 * `$search` requires; message `$search` results come back ordered by the
 * date/time sent, so callers pass `search` or `orderBy`, not both.
 */
export function buildListQuery(params: {
  limit?: number;
  search?: string;
  filter?: string;
  orderBy?: string;
  select?: string;
}): string {
  const sp = new URLSearchParams();
  if (params.limit !== undefined) sp.set("$top", String(params.limit));
  if (params.search !== undefined) sp.set("$search", `"${params.search}"`);
  if (params.filter !== undefined) sp.set("$filter", params.filter);
  if (params.orderBy !== undefined) sp.set("$orderby", params.orderBy);
  if (params.select !== undefined) sp.set("$select", params.select);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Normalize a Graph list response into the connector's `{ items, next_cursor }`
 * shape. `@odata.nextLink` is an opaque full URL — pass it back as `cursor` on
 * the next call and fetch it verbatim (don't reconstruct `$skip`/`$skiptoken`).
 */
export function toListResult<T>(payload: unknown): {
  items: T[];
  next_cursor?: string;
} {
  const p = (payload ?? {}) as {
    value?: T[];
    "@odata.nextLink"?: string;
  };
  const nextLink = p["@odata.nextLink"];
  return {
    items: p.value ?? [],
    ...(nextLink ? { next_cursor: nextLink } : {}),
  };
}

interface GraphErrorBody {
  error?: { code?: string; message?: string };
}

/**
 * Turn a non-2xx Graph response into an Error whose message names the failing
 * tool, the status, the Graph `error.code`, and an actionable recovery hint for
 * the cases that have one (stale/malformed ids, missing permission, throttle,
 * oversized attachment).
 */
export async function graphError(
  toolName: string,
  res: Response,
): Promise<Error> {
  const raw = await res.text().catch(() => "");
  let code = "";
  let message = "";
  if (raw) {
    try {
      const body = JSON.parse(raw) as GraphErrorBody;
      code = body.error?.code ?? "";
      message = body.error?.message ?? "";
    } catch {
      message = raw;
    }
  }
  const prefix = `Microsoft Outlook ${toolName} ${res.status}`;
  const detail = code ? `${code}: ${message}` : message || res.statusText;

  if (res.status === 404 || code === "ErrorItemNotFound") {
    return new Error(
      `${prefix}: ${detail}. The id may be stale — message and event ids change when an item moves between folders. Re-fetch the id from the relevant list/get tool and retry.`,
    );
  }
  if (code === "ErrorInvalidIdMalformed") {
    return new Error(
      `${prefix}: ${detail}. One of the ids is malformed — obtain a valid id from a list or get tool.`,
    );
  }
  if (res.status === 403 || code === "ErrorAccessDenied") {
    return new Error(
      `${prefix}: ${detail}. Reconnect your Outlook account to grant the permission this action needs (shared-mailbox access also requires Exchange-side delegation).`,
    );
  }
  if (res.status === 401) {
    return new Error(
      `${prefix}: ${detail}. The access token is invalid or expired — reconnect your Outlook account.`,
    );
  }
  if (res.status === 413) {
    return new Error(
      `${prefix}: ${detail}. Attachments must be under 3 MB and sent inline; larger files are not supported.`,
    );
  }
  if (res.status === 429) {
    const retryAfter = res.headers?.get?.("Retry-After");
    return new Error(
      `${prefix}: throttled by Microsoft Graph${
        retryAfter ? ` — retry after ${retryAfter}s` : ""
      }. ${message}`.trim(),
    );
  }
  return new Error(`${prefix}: ${detail}`);
}

/**
 * Make an authed Graph request. `fetch` is the connection-injected `ctx.fetch`
 * (the resolver chain has already attached the bearer token and the
 * `Prefer: IdType="ImmutableId"` header). Sets `Content-Type: application/json`
 * for JSON bodies, throws a mapped Error on non-2xx (via `graphError`), and
 * returns the raw Response so the caller parses it into the tool's output shape.
 */
export async function outlookFetch(
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
  if (!res.ok) throw await graphError(toolName, res);
  return res;
}
