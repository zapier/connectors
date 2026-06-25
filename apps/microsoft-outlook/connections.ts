// Microsoft Graph authorizes every call — read or write, mail or calendar or
// contacts — with a single OAuth 2.0 bearer token. There is no bot/user split
// and no per-request credential switch, so one connection key
// (`microsoft-outlook`) resolved by the standard chain (Zapier-managed first,
// direct env-token fallback) covers the whole connector.
//
// On top of auth, every request carries `Prefer: IdType="ImmutableId"`. Outlook
// message and event ids otherwise change when an item moves between folders,
// which is the dominant cause of stale-id 404s; immutable ids stay stable
// across moves, so an id captured from one call keeps working on the next.
// Scripts that set their own `Prefer` token (plain-text bodies on getMessage,
// a calendar timezone on calendar reads) are preserved — the wrapper appends to
// the comma-separated Prefer list rather than overwriting it.

import {
  defineEnvResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

const IMMUTABLE_ID_PREFER = 'IdType="ImmutableId"';

/**
 * Wrap a fetch so every request asks for immutable ids, merging with any
 * `Prefer` token the caller already set (Prefer is a comma-separated list).
 */
function withImmutableId(
  fetchImpl: typeof globalThis.fetch,
): typeof globalThis.fetch {
  return ((input, init = {}) => {
    const headers = new Headers(init.headers ?? undefined);
    const existing = headers.get("Prefer");
    headers.set(
      "Prefer",
      existing ? `${existing}, ${IMMUTABLE_ID_PREFER}` : IMMUTABLE_ID_PREFER,
    );
    return fetchImpl(input, { ...init, headers });
  }) as typeof globalThis.fetch;
}

/** A fetch that sends the given token as `Authorization: Bearer <token>`. */
function bearerFetch(token: string): typeof globalThis.fetch {
  return ((input, init = {}) => {
    const headers = new Headers(init.headers ?? undefined);
    headers.set("Authorization", `Bearer ${token}`);
    return globalThis.fetch(input, { ...init, headers });
  }) as typeof globalThis.fetch;
}

// Zapier-managed path: the Zapier auth layer injects the bearer token; we only
// add the Prefer header on top of the resolved fetch.
const zapierOutlookResolver = {
  ...zapierConnectionResolver,
  resolve: async (value: string) =>
    withImmutableId(await zapierConnectionResolver.resolve(value)),
};

// Direct path: read a Microsoft Graph access token from the named env var and
// send it as a Bearer header (no refresh in this mode — the runner supplies a
// valid token), then add the Prefer header.
const directOutlookResolver = defineEnvResolver({
  name: "env",
  valueDescription:
    "env var holding a Microsoft Graph access token, sent as `Authorization: Bearer <token>`; matches when the var is set",
  build: (token) => withImmutableId(bearerFetch(token)),
});

export const connectionResolvers = {
  "microsoft-outlook": [zapierOutlookResolver, directOutlookResolver],
} as const;
