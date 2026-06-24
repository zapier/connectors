// Shared test helpers (not a *.test.ts file, so vitest doesn't treat it as a suite).

/** Build a minimal Response-like object for mocking ctx.fetch. */
export function jsonResponse(
  body: unknown,
  init: { status?: number } = {},
): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

/** A GoogleAdsFailure error body with the given sub-error code + message. */
export function googleAdsErrorBody(
  errorCode: Record<string, string>,
  message: string,
): unknown {
  return {
    error: {
      code: 400,
      status: "INVALID_ARGUMENT",
      details: [{ errors: [{ errorCode, message }] }],
    },
  };
}

/** Capture fetch calls and return a fixed response. */
export function recordingFetch(
  body: unknown,
  init: { status?: number } = {},
): {
  fetch: typeof globalThis.fetch;
  calls: Array<{ url: string; init: RequestInit | undefined }>;
} {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const fetch = (async (url: string, reqInit?: RequestInit) => {
    calls.push({ url, init: reqInit });
    return jsonResponse(body, init);
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}
