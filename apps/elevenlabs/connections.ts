import {
  defineEnvResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

// ElevenLabs authenticates every request with a custom `xi-api-key` header
// (not `Authorization: Bearer`), so the direct-mode resolver wraps fetch to
// set that header from the env var the connection string names, e.g.
// `--connection env:ELEVENLABS_API_KEY`.
const elevenLabsApiKeyResolver = defineEnvResolver({
  name: "env",
  build:
    (apiKey) =>
    (input, init = {}) => {
      const headers = new Headers(init.headers);
      headers.set("xi-api-key", apiKey);
      return globalThis.fetch(input, { ...init, headers });
    },
});

export const connectionResolvers = {
  elevenlabs: [zapierConnectionResolver, elevenLabsApiKeyResolver],
} as const;
