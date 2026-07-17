// Shared DataForSEO request helper used by every tool.
//
// Every DataForSEO v3 endpoint takes the request as a single-element ARRAY of task
// objects and returns a { status_code, status_message, cost, tasks: [{ status_code,
// status_message, result, result_count }] } envelope — over HTTP 200. Failure is
// carried IN-BODY at two levels: a top-level `status_code` and a per-task
// `tasks[].status_code` (20000 = ok; e.g. 40501 = invalid field), with
// `tasks[0].result` = null on a task-level error while the HTTP status stays 200.
//
// This helper wraps the flat agent params into the task array (or issues a bodyless
// GET for the appendix/discovery endpoints), checks BOTH status levels (throwing a
// ConnectorHttpError so a "success-shaped error" never slips through as empty data),
// and unwraps the result into the flat agent surface `{ items, items_count, cost }`.
// Most endpoints nest the real rows one level deeper (`result[0].items[]`); the
// unwrap detects that wrapper and flattens it (tools do any further per-row
// flattening in their own run()). dataforseoLiveRaw returns the raw result[] for
// tools that need fields from the task-result container alongside its items.

import { ConnectorHttpError, throwIfNotOk } from "@zapier/connectors-sdk";

export const DATAFORSEO_API = "https://api.dataforseo.com";

/** DataForSEO's success status code (both envelope levels). */
const STATUS_OK = 20000;

interface DataforseoTask<T> {
  status_code?: number;
  status_message?: string;
  cost?: number;
  result_count?: number;
  result?: T[] | null;
}

interface DataforseoEnvelope<T> {
  status_code?: number;
  status_message?: string;
  cost?: number;
  tasks?: Array<DataforseoTask<T>>;
}

/** The flat agent-surface result: the unwrapped first task's `result` rows. */
export interface DataforseoResult<T> {
  items: T[];
  items_count: number;
  cost: number;
}

/**
 * Check both envelope status levels and return the validated first task plus the
 * top-level cost. Shared by every helper, since DataForSEO returns the same
 * `{ status_code, tasks:[{ status_code, result }] }` envelope for POST and GET.
 */
async function validateEnvelope<T>(
  res: Parameters<typeof throwIfNotOk>[0],
  label: string,
): Promise<{ task: DataforseoTask<T>; cost: number }> {
  // HTTP-level guard first (auth failures, 5xx, rate limiting come back non-2xx).
  await throwIfNotOk(res, label);

  const body = (await res.json()) as DataforseoEnvelope<T>;

  // Top-level in-body status (whole request rejected, e.g. auth / malformed payload).
  if (body.status_code !== STATUS_OK) {
    throw ConnectorHttpError.fromResponseBody(res, body, {
      message: `${label}: ${body.status_message ?? "request rejected"} (status_code ${body.status_code ?? "unknown"})`,
    });
  }

  // Per-task status (this specific query failed, e.g. invalid field 40501) — the
  // "success-shaped error" case: HTTP 200 + task status_code != 20000 + result null.
  const task = body.tasks?.[0];
  if (!task || task.status_code !== STATUS_OK) {
    const hint =
      task?.status_code === 40200
        ? " — insufficient credits; check getAccountBalance"
        : "";
    throw ConnectorHttpError.fromResponseBody(res, body, {
      message: `${label}: ${task?.status_message ?? "task returned no data"} (status_code ${task?.status_code ?? "none"})${hint}`,
    });
  }

  return { task, cost: body.cost ?? task.cost ?? 0 };
}

/**
 * Validate the envelope and unwrap `tasks[0].result` into the flat agent surface.
 */
async function unwrapEnvelope<T>(
  res: Parameters<typeof throwIfNotOk>[0],
  label: string,
): Promise<DataforseoResult<T>> {
  const { task, cost } = await validateEnvelope<T>(res, label);

  // Unwrap to the real data rows. Most live endpoints nest them one level
  // deeper than `task.result`: each `result[]` element is a task-result
  // container whose own `items[]` array holds the rows (plus metadata like
  // `items_count`). A minority (summary / discovery / account endpoints) put the
  // row fields directly on the `result[]` element. Detect the wrapper by an
  // array-typed `items` property and unwrap it; otherwise treat the `result[]`
  // elements as the rows themselves.
  const result = task.result ?? [];
  const first = result[0] as
    { items?: unknown; items_count?: number; total_count?: number } | undefined;
  const isWrapper = Array.isArray(first?.items);
  const items = (
    isWrapper
      ? result.flatMap((r) => (r as { items?: T[] }).items ?? [])
      : result
  ) as T[];
  const items_count = isWrapper
    ? (first?.items_count ?? first?.total_count ?? items.length)
    : (task.result_count ?? items.length);
  return { items, items_count, cost };
}

/**
 * Call a DataForSEO endpoint and return the unwrapped result. Defaults to the
 * live-task pattern (POST with the params array-wrapped into a single task). The
 * appendix/discovery endpoints (`/v3/appendix/user_data`,
 * `/v3/dataforseo_labs/locations_and_languages`) are GET-only and NOT
 * array-wrapped — pass `{ method: "GET" }` (with `params` = `{}`); the response
 * envelope is identical, so it unwraps through the same path.
 *
 * @param fetch  the connection-injected `ctx.fetch` (pre-authed).
 * @param path   the v3 endpoint path, e.g. "/v3/serp/google/organic/live/advanced".
 * @param params the flat task parameters (array-wrapped for POST; ignored for GET).
 * @param label  "<Tool> failed"-style call-site label for error messages.
 * @param opts   `{ method: "GET" }` for the bodyless GET endpoints; omit for POST.
 */
export async function dataforseoLive<T = Record<string, unknown>>(
  fetch: typeof globalThis.fetch,
  path: string,
  params: Record<string, unknown>,
  label: string,
  opts?: { method?: "GET" },
): Promise<DataforseoResult<T>> {
  const res =
    opts?.method === "GET"
      ? await fetch(`${DATAFORSEO_API}${path}`, { method: "GET" })
      : await fetch(`${DATAFORSEO_API}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([params]),
        });
  return unwrapEnvelope<T>(res, label);
}

/** The validated raw `tasks[0].result` array plus cost, for custom shaping. */
export interface DataforseoRawResult<T> {
  result: T[];
  cost: number;
}

/**
 * POST a single live-endpoint task and return the validated RAW `result[]` array
 * (no wrapper-unwrap heuristic). Use for endpoints whose task-result container
 * carries fields the tool needs *alongside* its `items[]` — e.g. the LLM
 * response endpoints (`model_name` / `money_spent` / `web_search` live on the
 * container, the answer text lives in `items[]`), or the ChatGPT scraper (whose
 * container holds parallel `search_results[]` / `sources[]` arrays). The tool
 * then shapes `result[0]` itself.
 */
export async function dataforseoLiveRaw<T = Record<string, unknown>>(
  fetch: typeof globalThis.fetch,
  path: string,
  params: Record<string, unknown>,
  label: string,
): Promise<DataforseoRawResult<T>> {
  const res = await fetch(`${DATAFORSEO_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([params]),
  });
  const { task, cost } = await validateEnvelope<T>(res, label);
  return { result: task.result ?? [], cost };
}

/**
 * Flatten a DataForSEO Labs keyword row into the flat agent surface
 * `{ keyword, search_volume, cpc, competition, keyword_difficulty, search_intent }`.
 * The API nests these metrics under `keyword_info` / `keyword_properties` /
 * `search_intent_info`, and some endpoints (related/suggestions) wrap the whole
 * row one level deeper under `keyword_data`; this reads through either shape.
 * Shared by getKeywordOverview / getKeywordSuggestions / getRelatedKeywords.
 */
export function flattenKeywordRow(row: unknown): {
  keyword: string | null;
  search_volume: number | null;
  cpc: number | null;
  competition: number | null;
  keyword_difficulty: number | null;
  search_intent: string | null;
} {
  const outer = row as { keyword_data?: unknown };
  const r = (outer.keyword_data ?? row) as {
    keyword?: string;
    keyword_info?: {
      search_volume?: number;
      cpc?: number;
      competition?: number;
    };
    keyword_properties?: { keyword_difficulty?: number };
    search_intent_info?: { main_intent?: string };
  };
  return {
    keyword: r.keyword ?? null,
    search_volume: r.keyword_info?.search_volume ?? null,
    cpc: r.keyword_info?.cpc ?? null,
    competition: r.keyword_info?.competition ?? null,
    keyword_difficulty: r.keyword_properties?.keyword_difficulty ?? null,
    search_intent: r.search_intent_info?.main_intent ?? null,
  };
}

/**
 * Shape an LLM-responses raw result (`chat_gpt` / `claude` / `gemini` /
 * `perplexity`) into one flat row per response. The task-result container
 * carries `model_name` / `money_spent` / `web_search`; the answer text lives in
 * its `items[]` (the `message`-type item's `sections[].text`, which this joins).
 * Shared by all get*Response tools.
 */
export function shapeLlmResponse(
  raw: DataforseoRawResult<unknown>,
): DataforseoResult<{
  model_name: string | null;
  message: string | null;
  web_search: boolean | null;
  money_spent: number | null;
}> {
  const items = raw.result.map((row) => {
    const r = row as {
      model_name?: string;
      money_spent?: number;
      web_search?: boolean;
      items?: Array<{ type?: string; sections?: Array<{ text?: string }> }>;
    };
    const message =
      (r.items ?? [])
        .filter((it) => it.type === "message")
        .flatMap((it) => (it.sections ?? []).map((s) => s.text))
        .filter((t): t is string => Boolean(t))
        .join("\n\n") || null;
    return {
      model_name: r.model_name ?? null,
      message,
      web_search: r.web_search ?? null,
      money_spent: r.money_spent ?? null,
    };
  });
  return { items, items_count: items.length, cost: raw.cost };
}

/**
 * Build DataForSEO's LLM-mentions target-entity array from the agent surface's
 * two plain string lists. The wire wants an array of entity objects, each with
 * a bare `domain` or `keyword` key (the object's key alone signals the entity
 * kind — there is no `type` discriminator). The agent passes `domains`
 * (websites) and `keywords` (search/brand terms) separately, since it knows
 * which each entity is. Used by all getLlmMentions* tools; cross-metrics calls
 * it once per aggregation set to build each set's inner `target` array.
 */
export function buildLlmMentionsTargets(opts: {
  domains?: string[];
  keywords?: string[];
}): Array<Record<string, string>> {
  const targets: Array<Record<string, string>> = [];
  for (const domain of opts.domains ?? []) {
    targets.push({ domain });
  }
  for (const keyword of opts.keywords ?? []) {
    targets.push({ keyword });
  }
  return targets;
}
