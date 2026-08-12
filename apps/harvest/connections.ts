import {
  defineEnvPrefixResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

/**
 * Harvest authenticates every API request with the SAME two-credential pair,
 * regardless of whether the underlying token is an OAuth2 access token or a
 * Personal Access Token (PAT):
 *
 *   - `Authorization: Bearer <token>`
 *   - `Harvest-Account-Id: <account_id>`   (one Harvest login can belong to
 *     several accounts; this numeric id selects which one the token acts on)
 *
 * Harvest also requires a `User-Agent` header on every request.
 *
 * Two credential sources, one wire shape:
 *   - Zapier-managed: `zapierConnectionResolver` is used UNWRAPPED. Zapier's
 *     managed-auth layer injects both headers (Authorization + Harvest-Account-Id)
 *     from the stored connection and handles OAuth refresh/rotation above the
 *     connector. A bare UUID-shaped connection value auto-claims this.
 *   - Direct: the `token` resolver reads a long-lived Personal Access Token and
 *     the account id from env vars and injects the same two headers itself. A
 *     PAT is the recommended direct-mode credential — it does not expire on a
 *     fixed schedule and needs no refresh, unlike a raw OAuth access token.
 *
 * Both paths inject the identical two headers, so a single resolver
 * design serves both — this is the BambooHR/Alpaca two-resolver shape (unwrapped
 * `zapierConnectionResolver` + a `defineEnvPrefixResolver` for the multi-field
 * direct credential), with header injection instead of a URL path placeholder,
 * so the host stays constant on the `api.harvestapp.com` allowlist.
 */

/** Pinned once here so a bump is a single edit; Harvest requires a User-Agent. */
const USER_AGENT = "Zapier Harvest Connector (support@zapier.com)";

// Direct mode: reads <PREFIX>_ACCESS_TOKEN + <PREFIX>_ACCOUNT_ID (e.g. HARVEST →
// HARVEST_ACCESS_TOKEN + HARVEST_ACCOUNT_ID). Auto-claims a bare value when both
// env vars are set. Injects Authorization: Bearer + Harvest-Account-Id + a
// constant User-Agent on every request.
const directHarvestResolver = defineEnvPrefixResolver({
  name: "token",
  keys: ["ACCESS_TOKEN", "ACCOUNT_ID"] as const,
  valuePlaceholder: "<ENV_VAR_PREFIX>",
  valueDescription:
    "prefix of <PREFIX>_ACCESS_TOKEN and <PREFIX>_ACCOUNT_ID (e.g. HARVEST → HARVEST_ACCESS_TOKEN + HARVEST_ACCOUNT_ID); ACCESS_TOKEN is a Personal Access Token (recommended) or OAuth access token, ACCOUNT_ID is the numeric Harvest account id. Injects Authorization: Bearer <token> + Harvest-Account-Id. Auto-claims a bare value when both are set.",
  build: ({ ACCESS_TOKEN, ACCOUNT_ID }) => {
    return ((input, init = {}) => {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${ACCESS_TOKEN}`);
      headers.set("Harvest-Account-Id", ACCOUNT_ID);
      if (!headers.has("User-Agent")) headers.set("User-Agent", USER_AGENT);
      return globalThis.fetch(input, { ...init, headers });
    }) as typeof globalThis.fetch;
  },
});

export const connectionResolvers = {
  // Zapier-managed resolver used AS-IS — no wrapper. Zapier injects both
  // Authorization: Bearer and Harvest-Account-Id from the stored connection.
  // The direct resolver is the fallback for the env-var PAT + account id.
  harvest: [zapierConnectionResolver, directHarvestResolver],
} as const;
