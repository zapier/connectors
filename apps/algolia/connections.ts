import {
  defineConnectionResolver,
  defineEnvPrefixResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

import { relayAlgoliaFetch, rewriteAlgoliaHost } from "./lib/algolia.ts";

// Algolia auth: two headers (x-algolia-application-id + x-algolia-api-key) and
// the Application ID as the host subdomain — there is no Authorization header.
// The resolver owns both: it sets the host to the account's Application ID (or
// its -dsn read host) and provides the two headers.
//
// Two paths, both supported:
//   zapier:<connection-id>  — managed auth. Routes through Zapier; the connector
//     emits {{application_id}} / {{search_api_key}} / {{write_api_key}}
//     placeholders that Zapier substitutes from the stored connection at request
//     time (reads use the search key, writes use the write key).
//   algolia:<PREFIX>        — direct auth. The PREFIX names two env vars, e.g.
//     `algolia:ALGOLIA` reads ALGOLIA_APPLICATION_ID + ALGOLIA_API_KEY. Supply a
//     key whose ACLs cover the actions you call (a search-only key drives the
//     read tools; a write/admin key is needed for the write tools).
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Managed resolver: reuse the SDK's Zapier connection fetch, then wrap it so the
// connector emits the Algolia host + auth-header placeholders for Zapier to fill.
const zapierAlgoliaResolver = defineConnectionResolver({
  name: "zapier",
  valuePlaceholder: "<connection-id>",
  valueDescription:
    "a Zapier connection id (managed auth); matches a bare UUID",
  canHandle: (value) => UUID_RE.test(value),
  resolve: async (connectionId, ctx) => {
    const relayFetch = await zapierConnectionResolver.resolve(
      connectionId,
      ctx,
    );
    return relayAlgoliaFetch(relayFetch);
  },
});

export const connectionResolvers = {
  algolia: [
    zapierAlgoliaResolver,
    defineEnvPrefixResolver({
      name: "algolia",
      keys: ["APPLICATION_ID", "API_KEY"] as const,
      valueDescription:
        "prefix for the ALGOLIA_APPLICATION_ID + ALGOLIA_API_KEY env vars (e.g. `algolia:ALGOLIA`)",
      build: ({ APPLICATION_ID, API_KEY }) =>
        rewriteAlgoliaHost(APPLICATION_ID, API_KEY),
    }),
  ],
} as const;
