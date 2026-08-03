// Shared Algolia helpers used across ≥3 scripts (host rewrite lives in the
// connection resolver; error mapping is wired into every script's run()).

/** The static placeholder host the connection resolver rewrites at call time. */
export const ALGOLIA_PLACEHOLDER_HOST = "application-id.algolia.net";

/**
 * Read-vs-write classification for the host split. Algolia serves reads from
 * the geo-routed DSN host and writes from the primary host. Reads are GET, plus
 * the POST "search/browse/lookup" endpoints (query, queries, browse, objects,
 * recommendations, facet-value query, synonym/rule search). Everything else
 * (indexing, settings, synonym/rule writes, deleteByQuery, clear, operation) is
 * a write.
 */
export function isAlgoliaReadRequest(
  method: string,
  pathname: string,
): boolean {
  if (method.toUpperCase() === "GET") return true;
  return (
    /(\/query|\/queries|\/browse|\/objects|\/recommendations)$/.test(
      pathname,
    ) ||
    /\/(synonyms|rules)\/search$/.test(pathname) ||
    /\/facets\/[^/]+\/query$/.test(pathname)
  );
}

type FetchInput = Parameters<typeof globalThis.fetch>[0];
type FetchInit = Parameters<typeof globalThis.fetch>[1];

function resolveRawUrl(input: FetchInput): string | null {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  const url = (input as { url?: unknown }).url;
  return typeof url === "string" ? url : null;
}

/**
 * Direct-mode fetch: rewrites the placeholder host to `<appId>.algolia.net`
 * (writes) or `<appId>-dsn.algolia.net` (reads), and injects the two Algolia
 * auth headers. Algolia has no Authorization header and carries the Application
 * ID in the host subdomain, so the resolver owns both (host rewrite + the two
 * auth headers).
 */
export function rewriteAlgoliaHost(
  appId: string,
  apiKey: string,
): typeof globalThis.fetch {
  const fetchImpl = ((input: FetchInput, init?: FetchInit) => {
    const method = (
      init?.method ??
      (typeof input !== "string" && !(input instanceof URL)
        ? (input as { method?: string }).method
        : undefined) ??
      "GET"
    ).toUpperCase();

    const raw = resolveRawUrl(input);
    let target: string;
    if (raw === null) {
      target = String(input);
    } else {
      const u = new URL(raw);
      if (
        u.hostname === ALGOLIA_PLACEHOLDER_HOST ||
        u.hostname.endsWith(".algolia.net") ||
        u.hostname.endsWith(".algolianet.com")
      ) {
        u.hostname = isAlgoliaReadRequest(method, u.pathname)
          ? `${appId}-dsn.algolia.net`
          : `${appId}.algolia.net`;
      }
      target = u.toString();
    }

    const headers = new Headers(
      init?.headers ??
        (typeof input !== "string" && !(input instanceof URL)
          ? (input as { headers?: ConstructorParameters<typeof Headers>[0] })
              .headers
          : undefined),
    );
    headers.set("x-algolia-application-id", appId);
    headers.set("x-algolia-api-key", apiKey);

    return globalThis.fetch(target, { ...init, headers });
  }) as typeof globalThis.fetch;
  return fetchImpl;
}

/**
 * Zapier-managed (Relay) fetch. The connector holds no credentials in this
 * mode — it emits `{{field}}` placeholders that Zapier substitutes from the
 * connection's stored auth fields at request time (the same connector-emitted
 * placeholder mechanism a token-in-URL app uses). We rewrite the placeholder
 * host to `{{application_id}}.algolia.net` (or its -dsn read host) and set the
 * two Algolia auth headers to placeholders, then hand off to the Zapier-managed fetch.
 *
 * Read requests use the search key, writes use the write key — matching the
 * connection's `search_api_key` / `write_api_key` fields.
 */
export function relayAlgoliaFetch(
  relayFetch: typeof globalThis.fetch,
): typeof globalThis.fetch {
  const fetchImpl = ((input: FetchInput, init?: FetchInit) => {
    const method = (
      init?.method ??
      (typeof input !== "string" && !(input instanceof URL)
        ? (input as { method?: string }).method
        : undefined) ??
      "GET"
    ).toUpperCase();

    const raw = resolveRawUrl(input);
    let target: string;
    let isRead = method === "GET";
    if (raw === null) {
      target = String(input);
    } else {
      // raw still carries the literal placeholder host, so new URL() is safe
      // here (no `{{ }}` to percent-encode yet); classify read/write, then
      // string-replace the host with the managed placeholder.
      const u = new URL(raw);
      isRead = isAlgoliaReadRequest(method, u.pathname);
      const placeholderHost = isRead
        ? "{{application_id}}-dsn.algolia.net"
        : "{{application_id}}.algolia.net";
      target = raw.replace(ALGOLIA_PLACEHOLDER_HOST, placeholderHost);
    }

    const headers = new Headers(
      init?.headers ??
        (typeof input !== "string" && !(input instanceof URL)
          ? (input as { headers?: ConstructorParameters<typeof Headers>[0] })
              .headers
          : undefined),
    );
    headers.set("x-algolia-application-id", "{{application_id}}");
    headers.set(
      "x-algolia-api-key",
      isRead ? "{{search_api_key}}" : "{{write_api_key}}",
    );

    return relayFetch(target, { ...init, headers });
  }) as typeof globalThis.fetch;
  return fetchImpl;
}

/**
 * Map an Algolia error response to an actionable message. Called by every
 * script after its fetch. No-op on a 2xx. Algolia error bodies are
 * `{ message, status }`.
 */
export async function ensureAlgoliaOk(
  res: Response,
  tool: string,
): Promise<void> {
  if (res.ok) return;
  const status = res.status;
  let detail = "";
  try {
    const body = (await res.clone().json()) as {
      message?: string;
      error?: string;
    };
    detail = body?.message || body?.error || "";
  } catch {
    try {
      detail = (await res.clone().text()).slice(0, 300);
    } catch {
      /* ignore */
    }
  }
  const suffix = detail ? ` — ${detail}` : "";
  if (status === 403) {
    throw new Error(
      `Algolia ${tool}: the API key lacks the required ACL for this action, or the key/Application ID is wrong or revoked (403)${suffix}. Check the key's ACLs in the Algolia dashboard, or provide a write-capable key for write actions.`,
    );
  }
  if (status === 404) {
    throw new Error(
      `Algolia ${tool}: not found (404)${suffix}. Check the index name and object ID.`,
    );
  }
  if (status === 400) {
    throw new Error(`Algolia ${tool}: bad request (400)${suffix}.`);
  }
  if (status === 429) {
    throw new Error(
      `Algolia ${tool}: rate limited (429)${suffix}. Retry after a short backoff.`,
    );
  }
  if (status >= 500) {
    throw new Error(
      `Algolia ${tool}: Algolia is temporarily unavailable (${status})${suffix}. Retry shortly.`,
    );
  }
  throw new Error(`Algolia ${tool}: request failed (${status})${suffix}.`);
}
