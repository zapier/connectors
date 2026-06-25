import {
  defineEnvPrefixResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

const TRELLO_OAUTH_HEADER = (apiKey: string, token: string) =>
  `OAuth oauth_consumer_key="${apiKey}", oauth_token="${token}"`;

const directTrelloResolver = defineEnvPrefixResolver({
  name: "env",
  keys: ["API_KEY", "TOKEN"] as const,
  build: ({ API_KEY, TOKEN }) => {
    const authorization = TRELLO_OAUTH_HEADER(API_KEY, TOKEN);
    return (url, init = {}) => {
      const headers = new Headers(init.headers);
      headers.set("Authorization", authorization);
      return globalThis.fetch(url, { ...init, headers });
    };
  },
});

// Trello OAuth 1.0a — one connection slot. Managed auth via Zapier; direct mode uses
// TRELLO_API_KEY + TRELLO_TOKEN (pass --connection env:TRELLO when both are set).
export const connectionResolvers = {
  trello: [zapierConnectionResolver, directTrelloResolver],
} as const;
