import {
  defineEnvPrefixResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

/**
 * Google Ads authenticates with Google OAuth 2.0 (the `adwords` scope) and
 * additionally requires an app-level `developer-token` header on every request.
 *
 * - **Zapier-managed** (`zapierConnectionResolver`): routes through the Zapier
 *   auth layer, which injects both the OAuth bearer and the developer token
 *   server-side — no extra wiring here.
 * - **Direct / env**: read the OAuth access token and the developer token from a
 *   `GOOGLE_ADS`-prefixed env pair and layer both onto every request. Pass
 *   `--connection env:GOOGLE_ADS`, which reads `GOOGLE_ADS_ACCESS_TOKEN` and
 *   `GOOGLE_ADS_DEVELOPER_TOKEN`.
 *
 * The per-request `login-customer-id` header (the manager account, when acting
 * through a manager) is request context, not a credential — it is set per call
 * in `lib/googleAdsFetch.ts` from the tool's `loginCustomerId` input, so it
 * behaves identically in both auth modes.
 */
const directResolver = defineEnvPrefixResolver({
  name: "env",
  keys: ["ACCESS_TOKEN", "DEVELOPER_TOKEN"] as const,
  build:
    ({ ACCESS_TOKEN, DEVELOPER_TOKEN }) =>
    (input, init = {}) =>
      globalThis.fetch(input, {
        ...init,
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "developer-token": DEVELOPER_TOKEN,
          ...(init.headers ?? {}),
        },
      }),
});

export const connectionResolvers = {
  "google-ads": [zapierConnectionResolver, directResolver],
} as const;
