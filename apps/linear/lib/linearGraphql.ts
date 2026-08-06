// Shared Linear GraphQL wrapper. Linear's whole API is a single endpoint —
// POST https://api.linear.app/graphql — whose body carries the operation. Every
// tool posts a typed query/mutation here, so the request shape, the
// `data.<field>` unwrap, and Linear's quirks (HTTP 200 with an `errors[]` array;
// HTTP 400 with a RATELIMITED code) are handled in one place rather than 22.

import {
  ConnectorHttpError,
  toConnectorHttpResponse,
} from "@zapier/connectors-sdk";

/** The single GraphQL endpoint this connector targets. */
export const LINEAR_GRAPHQL_URL = "https://api.linear.app/graphql";

interface GraphQLError {
  message?: string;
  extensions?: {
    type?: string;
    code?: string;
    userPresentableMessage?: string;
  };
}

/**
 * Post a GraphQL `query`/`mutation` (with `variables`) to Linear and return the
 * unwrapped `data` object. `fetch` is the connection-injected `ctx.fetch` — the
 * resolver chain has already attached the credential.
 *
 * Linear returns HTTP 200 even for operation errors (surfaced in a top-level
 * `errors` array), and HTTP 400 for rate limiting (a `RATELIMITED` error code),
 * so the HTTP status alone is not a reliable success signal — this wrapper
 * inspects `errors` and throws a `ConnectorHttpError` carrying the vendor
 * message for the agent/CLI to read.
 */
export async function linearGraphql<T = Record<string, unknown>>(
  fetch: typeof globalThis.fetch,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(LINEAR_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    data?: T;
    errors?: GraphQLError[];
  };

  if (Array.isArray(body.errors) && body.errors.length > 0) {
    const first = body.errors[0];
    const message =
      first.extensions?.userPresentableMessage ||
      first.message ||
      "Linear GraphQL request failed.";
    // Map rate limiting to 429, auth errors to 401, everything else to the
    // HTTP status (Linear uses 200 for most operation errors).
    const type = first.extensions?.type ?? first.extensions?.code ?? "";
    const status =
      type === "RATELIMITED" || res.status === 400
        ? 429
        : type === "authentication error"
          ? 401
          : res.status >= 400
            ? res.status
            : 400;
    throw new ConnectorHttpError(message, {
      response: toConnectorHttpResponse(
        { status, statusText: res.statusText, headers: res.headers },
        body,
      ),
    });
  }

  if (!res.ok) {
    throw new ConnectorHttpError(
      `Linear request failed with status ${res.status}.`,
      {
        response: toConnectorHttpResponse(
          {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
          },
          body,
        ),
      },
    );
  }

  return (body.data ?? ({} as T)) as T;
}
