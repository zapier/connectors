import {
  defineEnvResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

/**
 * Linear personal API keys are sent as a **bare** `Authorization: <key>` header
 * with **no `Bearer` prefix** (OAuth access tokens use `Bearer`; the
 * Zapier-managed path handles that scheme itself). So the direct-mode resolver
 * attaches the raw key verbatim rather than the SDK's Bearer-defaulting sugar.
 *
 * Get a personal API key from Linear's Security & access settings.
 * Env var: `LINEAR_API_KEY` (use `--connection env:LINEAR_API_KEY`).
 */
const linearApiKeyResolver = defineEnvResolver({
  name: "env",
  valuePlaceholder: "LINEAR_API_KEY",
  valueDescription:
    "A Linear personal API key (lin_api_...), sent as a bare Authorization header.",
  build: (token) => {
    const authedFetch: typeof globalThis.fetch = (input, init = {}) => {
      const headers = new Headers(init.headers);
      headers.set("Authorization", token);
      return globalThis.fetch(input, { ...init, headers });
    };
    return authedFetch;
  },
});

export const connectionResolvers = {
  // Zapier-managed auth first (Relay attaches the token per request), then the
  // direct personal-API-key path.
  linear: [zapierConnectionResolver, linearApiKeyResolver],
} as const;
