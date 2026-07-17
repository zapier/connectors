import {
  defineEnvResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

/**
 * HeyGen authenticates with a static, long-lived API key sent in the `X-Api-Key`
 * header (not `Authorization: Bearer`). The key is minted once in the HeyGen web
 * app (Settings → API) and pasted in — no browser consent, no expiry.
 *
 * - Zapier-managed (`zapierConnectionResolver`): routes through the Zapier auth,
 *   retries, and governance layer, which injects the credential per request.
 * - Direct (`directHeygenResolver`): reads the key from the env var named in the
 *   connection string (`env:HEYGEN_API_KEY`) and sets the `X-Api-Key` header.
 *   This is the confirmed v1 path; the managed path is best-effort until exercised.
 */
const directHeygenResolver = defineEnvResolver({
  name: "env",
  valueDescription:
    "name of the env var holding the HeyGen API key; sent as the X-Api-Key header (e.g. env:HEYGEN_API_KEY).",
  build: (apiKey) =>
    ((input, init = {}) => {
      // Merge via `Headers` (not a spread) so a script's own Content-Type/Accept
      // survives — `{ ...new Headers() }` is `{}` and would drop them.
      const headers = new Headers(init.headers);
      headers.set("X-Api-Key", apiKey);
      return globalThis.fetch(input, { ...init, headers });
    }) as typeof globalThis.fetch,
});

export const connectionResolvers = {
  heygen: [zapierConnectionResolver, directHeygenResolver],
} as const;
