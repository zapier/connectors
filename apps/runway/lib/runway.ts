// Shared Runway generation-task helpers. Every generation endpoint (visual,
// audio, and recipe) is asynchronous: the POST returns a task id and the agent
// polls `getTask` until a terminal state. This module centralizes the pieces
// that ~19 generate tools share — the task shape, the output schemas, and the
// optional `wait` behavior — so they stay consistent across the catalog.

import { z } from "zod";

import { runwayFetch } from "./runwayFetch.ts";

/** The six task states Runway reports. THROTTLED is not an error — keep polling. */
export const taskStatusSchema = z
  .enum(["PENDING", "THROTTLED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"])
  .describe(
    "PENDING/THROTTLED (queued; THROTTLED means an org concurrency pool is full — not an error, keep polling), RUNNING (in progress), SUCCEEDED (done), FAILED, or CANCELLED.",
  );

/** The full task object returned by getTask (status is always present here). */
export const taskSchema = z.object({
  id: z.string().describe("The task id."),
  status: taskStatusSchema,
  createdAt: z
    .string()
    .describe("When the task was created (RFC3339).")
    .optional(),
  progress: z
    .number()
    .nullable()
    .describe("Fraction complete from 0 to 1, present while RUNNING.")
    .optional(),
  output: z
    .array(z.string())
    .nullable()
    .describe(
      "Finished asset URLs, present when SUCCEEDED. These URLs expire in 24-48 hours — download the assets promptly and rehost them; they are not durable references.",
    )
    .optional(),
  failure: z
    .string()
    .nullable()
    .describe("Human-readable failure reason, present when FAILED.")
    .optional(),
  failureCode: z
    .string()
    .nullable()
    .describe(
      "Machine-readable failure code, present when FAILED. SAFETY.* and ASSET.INVALID should not be retried unchanged; INTERNAL/THIRD_PARTY.UNAVAILABLE are transient and may be retried.",
    )
    .optional(),
});

/**
 * Output shape for the async generate/audio/recipe tools. By default they
 * return just `{ id }`; when the caller sets `wait: true` the same shape is
 * populated with the terminal task's status and output URLs.
 */
export const generationResultSchema = z.object({
  id: z
    .string()
    .describe(
      "The generation task id. Poll getTask with this id for status and finished asset URLs (unless you passed wait: true, in which case the terminal status and output are already populated below).",
    ),
  status: taskStatusSchema
    .describe(
      "The task's status after polling — usually terminal (SUCCEEDED/FAILED), but may still be PENDING/THROTTLED/RUNNING if wait: true timed out (~5 min); call getTask to keep polling. Present only when wait: true was set.",
    )
    .optional(),
  output: z
    .array(z.string())
    .nullable()
    .describe(
      "Finished asset URLs (expire in 24-48 hours). Present only when wait: true was set and the task SUCCEEDED.",
    )
    .optional(),
  failure: z
    .string()
    .nullable()
    .describe(
      "Failure reason. Present only when wait: true was set and the task FAILED.",
    )
    .optional(),
  failureCode: z
    .string()
    .nullable()
    .describe(
      "Machine failure code. Present only when wait: true was set and the task FAILED.",
    )
    .optional(),
});

/**
 * The shared `wait` input every async generate/audio/recipe tool exposes. It is
 * a connector-side behavior, not a Runway wire field — run() strips it before
 * building the request body.
 */
export const waitInputField = z
  .boolean()
  .default(false)
  .describe(
    "When true, poll the task to a terminal state and return its status + output URLs instead of returning immediately with just the task id. Generation can take minutes (video especially), so leave false (the default) for a fast call and poll getTask yourself; set true only for short jobs where blocking is acceptable.",
  );

// Poll cadence for wait: true. Generation is slow, so a coarse interval keeps
// request volume low; the attempt cap bounds a single blocking call to ~5 min,
// after which run() returns the last (non-terminal) task so the agent can keep
// polling getTask itself.
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 60;
const TERMINAL_STATES = new Set(["SUCCEEDED", "FAILED", "CANCELLED"]);

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** Fetch a single task by id. */
export async function fetchTask(
  fetch: typeof globalThis.fetch,
  id: string,
  label: string,
): Promise<z.infer<typeof taskSchema>> {
  const res = await runwayFetch(
    fetch,
    `/tasks/${encodeURIComponent(id)}`,
    { method: "GET" },
    label,
  );
  return (await res.json()) as z.infer<typeof taskSchema>;
}

/**
 * POST a generation request and, when `wait` is set, poll the created task to a
 * terminal state. Returns `{ id }` (wait: false) or the resolved task fields
 * (wait: true). Shared by every async generate/audio/recipe tool so the
 * fire-and-poll vs. block-until-done choice behaves identically catalog-wide.
 */
export async function submitGeneration(
  fetch: typeof globalThis.fetch,
  path: string,
  body: Record<string, unknown>,
  wait: boolean,
  label: string,
): Promise<z.infer<typeof generationResultSchema>> {
  const res = await runwayFetch(
    fetch,
    path,
    { method: "POST", body: JSON.stringify(body) },
    label,
  );
  const created = (await res.json()) as { id: string };

  if (!wait) return { id: created.id };

  let task = await fetchTask(fetch, created.id, label);
  for (
    let attempt = 0;
    attempt < MAX_POLL_ATTEMPTS && !TERMINAL_STATES.has(task.status);
    attempt++
  ) {
    await sleep(POLL_INTERVAL_MS);
    task = await fetchTask(fetch, created.id, label);
  }

  return {
    id: task.id,
    status: task.status,
    output: task.output ?? undefined,
    failure: task.failure ?? undefined,
    failureCode: task.failureCode ?? undefined,
  };
}
