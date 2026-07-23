import {
  defineEnvResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

// Clay authenticates every request with the API key sent as the RAW value of
// the `authorization` header — no `Bearer ` prefix and no scheme (verified
// against the production Zapier integration, which sets
// `request.headers.authorization = <apiToken>`). The Bearer-style
// `defineEnvTokenResolver` would emit `Authorization: <scheme> <token>`, so the
// generic `defineEnvResolver` is used to wrap fetch and set the raw header
// (same shape as the ElevenLabs `xi-api-key` connector). Direct mode names the
// key via the connection string, e.g. `--connection env:CLAY_API_KEY`.
const clayApiKeyResolver = defineEnvResolver({
  name: "env",
  valueDescription: "Clay API key (Settings → Account → API keys)",
  build:
    (apiKey) =>
    (input, init = {}) => {
      const headers = new Headers(init.headers);
      headers.set("authorization", apiKey);
      return globalThis.fetch(input, { ...init, headers });
    },
});

export const connectionResolvers = {
  clay: [zapierConnectionResolver, clayApiKeyResolver],
} as const;
