// Shared Pipedrive helpers used across every script.
//
// Why this exists: every Pipedrive endpoint returns the same envelope —
// `{ success: boolean, data: <record|array>, additional_data?: {...},
// error?: string, error_info?: string }`. On failure Pipedrive returns a non-2xx
// HTTP status AND `success: false` with a human-readable `error` + a doc-pointer
// `error_info`. The error-body extraction plus the status-code → recovery-hint
// mapping is identical across all 50 tools, so it lives here rather than being
// duplicated (and drifting) per script. This is the one purely-mechanical helper
// genuinely shared by every tool; per-tool input/output schemas stay inline in
// each script so the agent can reason about a tool from its own source.
//
// The envelope UNWRAP (`.data`, `{ items: .data, next_cursor: ... }`) is NOT done
// here — each script applies its own unwrap. readPipedrive only enforces the error
// convention and hands the raw parsed body back; the script then returns its unwrap.

import { ConnectorHttpError } from "@zapier/connectors-sdk";

/** The envelope every Pipedrive API response shares. */
export interface PipedriveResponse {
  success?: boolean;
  data?: unknown;
  additional_data?: unknown;
  /** Human-readable error message on failure. */
  error?: string;
  /** Doc pointer / extra context on failure. */
  error_info?: string;
  [key: string]: unknown;
}

/** Actionable, agent-facing hints for the HTTP statuses worth special-casing. */
const STATUS_HINTS: Record<number, string> = {
  400: "the request is malformed or a field value is invalid — check error_info and the field formats (ids are integers; lead ids are UUIDs; custom-field keys are 40-char hashes from the entity's list_*_fields tool)",
  401: "the token is missing or expired — reconnect the Pipedrive account",
  403: "the token lacks permission/scope for this resource, or the plan doesn't include it",
  404: "no such record — the id is wrong or it was already deleted",
  410: "this endpoint is gone — Pipedrive deprecated selected v1 endpoints (unavailable after 2025-12-31); use the v2 equivalent",
  429: "rate limited by Pipedrive — retry after the x-ratelimit-reset interval",
};

/**
 * Build an actionable `ConnectorHttpError` from a Pipedrive failure response.
 * The message names the failing tool, Pipedrive's `error` message, its
 * `error_info` if present, and a status-based recovery hint. The HTTP status is
 * not in the message — `ConnectorHttpError.toString()` always renders it. The
 * full response — status, headers (e.g. the raw `Retry-After` on a 429), and
 * body (which carries the structured `error`/`error_info`) — is carried for
 * agents/CLI to inspect.
 */
export function mapPipedriveError(
  tool: string,
  res: Pick<Response, "status" | "statusText" | "headers">,
  data: PipedriveResponse,
): ConnectorHttpError {
  const msg = data.error ?? "unknown error";
  const info = data.error_info ? ` (${data.error_info})` : "";
  const hint = STATUS_HINTS[res.status];
  return ConnectorHttpError.fromResponseBody(res, data, {
    message: `Pipedrive ${tool}: ${msg}${info}${hint ? ` — ${hint}` : ""}`,
  });
}

/**
 * Parse a Pipedrive response, enforcing the non-2xx / `success:false`-is-an-error
 * convention, and return the raw parsed body. Throws a mapped error otherwise.
 *
 * The cast also bridges the SDK typing gap (res.json() is typed `unknown`).
 * The caller keeps its own envelope unwrap (e.g. `return body.data` or
 * `{ items: body.data, next_cursor: ... }`).
 */
export async function readPipedrive(
  tool: string,
  res: Pick<Response, "ok" | "status" | "statusText" | "headers" | "json">,
): Promise<PipedriveResponse> {
  const data = (await res.json()) as PipedriveResponse;
  if (!res.ok || data.success === false) {
    throw mapPipedriveError(tool, res, data);
  }
  return data;
}

const V1_DATETIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

/**
 * Normalize a Pipedrive v1 timestamp ("YYYY-MM-DD HH:MM:SS", UTC) to RFC-3339.
 * Pipedrive v1 returns space-separated, offset-less timestamps that fail the
 * strict `z.string().datetime({ offset: true })` output schemas. v1 timestamps
 * are documented as UTC, so we append "Z". Passes through already-RFC-3339
 * strings, null/undefined, and any non-matching value untouched.
 */
export function toRfc3339<T>(value: T): T | string {
  if (typeof value === "string" && V1_DATETIME.test(value)) {
    return `${value.replace(" ", "T")}Z`;
  }
  return value;
}
