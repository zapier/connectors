// Shared Notion request wrapper. Every Notion API call must carry the
// `Notion-Version` header — pin it in one place so a version bump is a
// single edit, not 24. The wrapper also sets `Content-Type` for JSON bodies
// and routes non-2xx responses through the SDK's `throwForStatus`, which
// throws a `ConnectorHttpError` carrying the status + parsed error body
// (Notion's `{ object: "error", code, message }`) for the agent/CLI to
// inspect — so each script's run() stays focused on its own response shape.

import { throwForStatus } from "@zapier/connectors-sdk";

/** The Notion API version this connector targets (the data-sources model). */
export const NOTION_VERSION = "2025-09-03";

/**
 * Make an authed Notion request. `fetch` is the connection-injected
 * `ctx.fetch` (or a `ctx.connections.<slot>` fetch); the resolver chain has
 * already attached the bearer token. Adds `Notion-Version` (+ `Content-Type`
 * for bodies), throws a `ConnectorHttpError` on non-2xx (via `throwForStatus`),
 * and returns the raw Response so the caller can `.json()` it into the tool's
 * output shape. The error's call chain points back at the calling script's
 * `run()`, so no per-call label is needed.
 */
export async function notionFetch(
  fetch: typeof globalThis.fetch,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Notion-Version", NOTION_VERSION);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
  await throwForStatus(res);
  return res;
}
