// batchUpdate envelope helper. The entire Google Docs write surface is one RPC
// (POST /v1/documents/{id}:batchUpdate) carrying a `requests` array of
// tagged-union Request objects. Each edit tool builds its own specific Request
// (InsertText, UpdateTextStyle, …) and posts it through here; the helper owns
// the envelope and returns the `replies` array (some Requests echo a result,
// e.g. ReplaceAllText's occurrencesChanged, InsertInlineImage's objectId).
//
// batchUpdate is atomic: all requests are validated, then applied together or
// not at all — a wholly-failed batch leaves the document unchanged and is safe
// to retry. Each connector tool issues ONE request, so within-call index shift
// never arises; the cross-call staleness hazard (indices go stale after any
// edit) is the agent's to manage by re-reading getDocument/findText.

import { DOCS_BASE } from "./constants.ts";
import { googleDocsFetch } from "./googleDocsFetch.ts";

/** A batchUpdate Request — the tagged-union shape varies per request type. */
export type BatchUpdateRequest = Record<string, unknown>;

/** A reply for one request (only some request types populate a reply). */
export type BatchUpdateReply = Record<string, unknown>;

/**
 * Post a batchUpdate to a document and return the `replies` array (one entry per
 * request, in order; empty objects for requests that don't echo a result).
 * Throws on an empty `requests` array — the API rejects it with a 400.
 */
export async function batchUpdate(
  fetch: typeof globalThis.fetch,
  documentId: string,
  requests: BatchUpdateRequest[],
  opName: string,
): Promise<BatchUpdateReply[]> {
  if (requests.length === 0) {
    throw new Error(
      `Google Docs ${opName}: no edit requests to apply (an empty batchUpdate is rejected by the API).`,
    );
  }
  const url = `${DOCS_BASE}/documents/${encodeURIComponent(documentId)}:batchUpdate`;
  const res = await googleDocsFetch(
    fetch,
    url,
    { method: "POST", body: JSON.stringify({ requests }) },
    opName,
  );
  const json = (await res.json()) as { replies?: BatchUpdateReply[] };
  return json.replies ?? [];
}

/**
 * Retry a create-then-edit follow-up through Google's post-create eventual
 * consistency. A batchUpdate fired immediately after documents.create /
 * files.copy can 404/403/5xx before the new document is fully readable; retry
 * with truncated exponential backoff. Non-transient failures (e.g. a 400 bad
 * request) are re-thrown immediately — only the eventual-consistency statuses
 * are retried.
 */
export async function withReadinessRetry<T>(
  op: () => Promise<T>,
  sleep: (ms: number) => Promise<void> = (ms) =>
    new Promise((r) => setTimeout(r, ms)),
  attempts = 4,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await op();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const transient = / 404| 403| 5\d\d/.test(msg);
      if (!transient || i === attempts - 1) throw err;
      await sleep(Math.min(2000, 250 * 2 ** i));
    }
  }
  throw lastErr;
}
