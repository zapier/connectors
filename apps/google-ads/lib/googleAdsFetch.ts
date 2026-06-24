// Shared Google Ads request wrapper. Every call targets the v23 REST endpoint on
// googleads.googleapis.com, carries the connection-injected OAuth bearer +
// developer-token (set by the resolver), and — when acting through a manager
// account — a per-call `login-customer-id` header set here from the tool's
// `loginCustomerId` input. Non-2xx responses are mapped to actionable errors
// from Google's GoogleAdsFailure envelope, so each script's run() stays focused
// on its own response shape. The two helpers below cover the connector's two
// HTTP shapes: GAQL reads (googleAds:search) and resource mutates (:mutate).

import { ConnectorHttpError, readResponseBody } from "@zapier/connectors-sdk";

/** The Google Ads API version this connector targets. */
export const GOOGLE_ADS_VERSION = "v23";
export const GOOGLE_ADS_API = `https://googleads.googleapis.com/${GOOGLE_ADS_VERSION}`;

/**
 * Default row cap for the list/report tools when the caller omits `limit`.
 * A soft cap: the agent can raise `limit` or page via `pageToken`. Without it,
 * `googleAds:search` returns up to 10,000 rows per page (it rejects `pageSize`),
 * which floods an agent's context on large accounts.
 */
export const DEFAULT_ROW_LIMIT = 50;

type Fetch = typeof globalThis.fetch;

interface RequestOpts {
  /** Path relative to the version root, e.g. `/customers/123/googleAds:search`. */
  path: string;
  method?: "GET" | "POST";
  /** JSON request body; omit for GET. */
  body?: unknown;
  /** Manager account id (digits only) for the `login-customer-id` header. */
  loginCustomerId?: string;
  /** Tool name for error messages, e.g. "search". */
  toolName: string;
}

/** Shape of the Google Ads JSON error envelope (the fields we read). */
interface GoogleAdsErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: Array<{
      errors?: Array<{
        errorCode?: Record<string, string>;
        message?: string;
      }>;
    }>;
  };
}

/**
 * Build an actionable message from a non-2xx Google Ads response body. Pulls the
 * first GoogleAdsFailure sub-error when present and adds a recovery hint for the
 * two failure modes an agent can act on (manager-account routing and malformed
 * GAQL). The status is named here (toString also renders it) so the one-line
 * `.message` reads on its own.
 */
function googleAdsMessage(
  toolName: string,
  status: number,
  body: unknown,
): string {
  if (typeof body !== "object" || body === null) {
    const text = typeof body === "string" ? body : "";
    return `Google Ads ${toolName} ${status}: ${text || "unknown error"}`;
  }
  const err = (body as GoogleAdsErrorBody).error;
  const sub = err?.details?.[0]?.errors?.[0];
  const code = sub?.errorCode ? Object.values(sub.errorCode)[0] : undefined;
  const message = sub?.message ?? err?.message ?? "unknown error";

  if (
    code === "USER_PERMISSION_DENIED" ||
    /permission to access customer/i.test(message)
  ) {
    return `Google Ads ${toolName} ${status}: ${message} When the account is accessed through a manager account, set loginCustomerId to the manager account id (digits only).`;
  }
  if (sub?.errorCode && "queryError" in sub.errorCode) {
    return `Google Ads ${toolName} ${status}: GAQL error (${code}): ${message} Discover valid fields for a resource with listSearchableFields, then fix the SELECT/FROM/WHERE clause.`;
  }
  return `Google Ads ${toolName} ${status} (${code ?? err?.status ?? "error"}): ${message}`;
}

/**
 * Turn a non-2xx Google Ads response into a `ConnectorHttpError`. The full
 * response (status, headers, body) is captured on `error.response` and renders
 * in `toString()` — so the GoogleAdsFailure envelope (and any unrecognized
 * edge/proxy body) surfaces intact instead of collapsing to a derived one-liner.
 */
function googleAdsError(
  toolName: string,
  res: Pick<Response, "status" | "statusText" | "headers">,
  body: unknown,
): ConnectorHttpError {
  return ConnectorHttpError.fromResponseBody(res, body, {
    message: googleAdsMessage(toolName, res.status, body),
  });
}

/** Make an authed Google Ads request and return the parsed JSON body. */
export async function googleAdsRequest<T>(
  fetch: Fetch,
  { path, method = "POST", body, loginCustomerId, toolName }: RequestOpts,
): Promise<T> {
  const headers = new Headers();
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (loginCustomerId) headers.set("login-customer-id", loginCustomerId);

  const res = await fetch(`${GOOGLE_ADS_API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    // Read the body once: JSON for the GoogleAdsFailure envelope, raw text for
    // an unrecognized edge/proxy body. (The old json()-then-text() fallback
    // couldn't reach the text branch — the failed json() had already consumed
    // the stream.)
    throw googleAdsError(toolName, res, await readResponseBody(res));
  }
  return (await res.json()) as T;
}

/** One row of a googleAds:search response — the fields mirror the query's SELECT. */
export type SearchRow = Record<string, unknown>;

export interface SearchResponse {
  results: SearchRow[];
  nextPageToken?: string;
  fieldMask?: string;
}

/**
 * Run a GAQL query against `customers/{customerId}/googleAds:search` (the
 * paginated read endpoint). Returns the raw rows plus the page token; callers
 * shape the rows per their tool's output schema.
 */
export async function searchGaql(
  fetch: Fetch,
  opts: {
    customerId: string;
    query: string;
    pageToken?: string;
    loginCustomerId?: string;
    toolName: string;
  },
): Promise<SearchResponse> {
  const body: Record<string, unknown> = { query: opts.query };
  if (opts.pageToken) body.pageToken = opts.pageToken;
  const json = await googleAdsRequest<{
    results?: SearchRow[];
    nextPageToken?: string;
    fieldMask?: string;
  }>(fetch, {
    path: `/customers/${opts.customerId}/googleAds:search`,
    method: "POST",
    body,
    loginCustomerId: opts.loginCustomerId,
    toolName: opts.toolName,
  });
  return {
    results: json.results ?? [],
    nextPageToken: json.nextPageToken,
    fieldMask: json.fieldMask,
  };
}

/** A single resource mutate operation (create or update). */
export type MutateOperation = Record<string, unknown>;

/**
 * Run a resource mutate against `customers/{customerId}/{resource}:mutate` and
 * return the first result's resource name. `resource` is the REST collection,
 * e.g. `campaigns`, `campaignBudgets`, `conversionActions`.
 */
export async function mutate(
  fetch: Fetch,
  opts: {
    customerId: string;
    resource: string;
    operations: MutateOperation[];
    loginCustomerId?: string;
    toolName: string;
  },
): Promise<{ resource_name: string }> {
  const json = await googleAdsRequest<{
    results?: Array<{ resourceName?: string }>;
  }>(fetch, {
    path: `/customers/${opts.customerId}/${opts.resource}:mutate`,
    method: "POST",
    body: { operations: opts.operations },
    loginCustomerId: opts.loginCustomerId,
    toolName: opts.toolName,
  });
  const resourceName = json.results?.[0]?.resourceName;
  if (!resourceName) {
    throw new Error(
      `Google Ads ${opts.toolName}: the mutate succeeded but returned no resource name.`,
    );
  }
  return { resource_name: resourceName };
}
