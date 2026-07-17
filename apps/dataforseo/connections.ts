import { Buffer } from "node:buffer";

import {
  defineEnvPrefixResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

/**
 * DataForSEO auth is HTTP Basic: the account login (email) as the username and a
 * dedicated API password (generated in the DataForSEO dashboard, distinct from the
 * account password) as the password. There is a single fixed host
 * (api.dataforseo.com) and no scopes — a credential inherits the account's full API
 * access.
 *
 *  - Zapier-managed: `zapierConnectionResolver` is used AS-IS. The Zapier auth /
 *    retries / governance layer injects the Basic credential from the stored
 *    connection. A bare UUID-shaped connection value auto-claims this.
 *  - Direct: the `basic` resolver reads <PREFIX>_LOGIN and <PREFIX>_PASSWORD and
 *    sends `Authorization: Basic base64(login:password)`.
 */

const directDataforseoResolver = defineEnvPrefixResolver({
  name: "basic",
  keys: ["LOGIN", "PASSWORD"] as const,
  valuePlaceholder: "<ENV_VAR_PREFIX>",
  valueDescription:
    "prefix of <PREFIX>_LOGIN and <PREFIX>_PASSWORD; injects HTTP Basic auth (login:password). Auto-claims a bare value when both are set.",
  build: ({ LOGIN, PASSWORD }) => {
    const authorization = `Basic ${Buffer.from(`${LOGIN}:${PASSWORD}`).toString("base64")}`;
    const authedFetch: typeof globalThis.fetch = (input, init = {}) =>
      globalThis.fetch(input, {
        ...init,
        headers: { ...(init.headers ?? {}), authorization },
      });
    return authedFetch;
  },
});

export const connectionResolvers = {
  dataforseo: [zapierConnectionResolver, directDataforseoResolver],
} as const;
