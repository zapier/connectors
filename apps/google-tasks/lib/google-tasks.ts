// Shared Google Tasks error mapping.
//
// Google returns the same `{ error: { code, message, errors:[{reason}] } }`
// body across the whole API, and the reason string is what tells an agent
// whether to reconnect, back off, or ask for access. Every tool routes its
// non-OK responses through throwForGoogleTasks so the recovery guidance is
// uniform.

import { ConnectorHttpError } from "@zapier/connectors-sdk";

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
 * Google Tasks response, mapping Google's `reason` strings to the recovery the
 * agent should take (reconnect vs back-off vs ask-for-access). On success the
 * response is returned unchanged so the caller can read the body. Pass the tool
 * name so the message names the failing operation.
 */
export async function throwForGoogleTasks(
  res: Response,
  toolName: string,
): Promise<Response> {
  if (res.ok) return res;
  const body = await readBody(res);
  const err = (body as GoogleErrorBody | undefined)?.error;
  const reason = err?.errors?.[0]?.reason;
  const apiMessage = err?.message;
  const prefix = `Google Tasks ${toolName} ${res.status}`;

  let message: string;
  if (res.status === 401) {
    message = `${prefix}: invalid or expired credentials. Reconnect Google Tasks.`;
  } else if (res.status === 429 || (reason && RATE_LIMIT_REASONS.has(reason))) {
    message = `${prefix}: ${reason ?? "rateLimitExceeded"} — rate/quota limited (50,000 queries/day/project). Back off and retry with jitter (no Retry-After is sent).`;
  } else if (res.status === 403 && reason === "insufficientPermissions") {
    message = `${prefix}: insufficientPermissions — reconnect Google Tasks with task access (the granted OAuth scope is too narrow; write tools need the full tasks scope, not tasks.readonly).`;
  } else if (res.status === 403) {
    message = `${prefix}: ${reason ?? "forbidden"} — ${apiMessage ?? "access denied"}.`;
  } else if (res.status === 404) {
    message = `${prefix}: ${reason ?? "notFound"} — ${apiMessage ?? "the task list or task does not exist"}. Verify the id (resolve task lists via listTaskLists, tasks via listTasks or findTask).`;
  } else {
    message = `${prefix}: ${apiMessage ?? reason ?? "request failed"}`;
  }

  throw ConnectorHttpError.fromResponseBody(res, body, { message });
}

/**
 * Many Tasks endpoints (delete*, clearCompletedTasks) return an empty body.
 * The agent surface for those is a `{ success: true }` confirmation.
 */
export const SUCCESS = { success: true } as const;
