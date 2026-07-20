// Shared GA4 error handling. Every OAuth-authenticated Data/Admin API tool
// routes its non-2xx response through `throwIfGaError` so the error behavior —
// and the recovery hints for the load-bearing statuses — stay identical across
// the catalog. Google returns a standard envelope `{ error: { code, message,
// status } }`; the `status` string (PERMISSION_DENIED, RESOURCE_EXHAUSTED, …)
// is the signal we key the hints off. The full upstream Response (status,
// headers, body) always rides along on the thrown `error.response`.
import { ConnectorHttpError, readResponseBody } from "@zapier/connectors-sdk";

type GoogleErrorEnvelope = {
  error?: { code?: number; message?: string; status?: string };
};

/**
 * Build the `properties/{numericId}` path segment GA4 URLs require, tolerating
 * either shape the agent might pass: the bare numeric id (`123456`) or the full
 * resource name (`properties/123456`, exactly what listAccountSummaries returns
 * in `propertySummaries[].property`). Strips a single leading `properties/` so a
 * verbatim discovery value doesn't double-prefix into `properties/properties%2F…`.
 */
export function toPropertyPath(propertyId: string): string {
  const id = propertyId.replace(/^properties\//, "");
  return `properties/${encodeURIComponent(id)}`;
}

/**
 * Route a GA4 API Response through the SDK error path, adding a GA-specific
 * recovery hint for the load-bearing statuses. Returns the Response unchanged
 * on 2xx. `toolName` names the call site in the error message (e.g. "runReport").
 */
export async function throwIfGaError(
  res: Response,
  toolName: string,
): Promise<Response> {
  if (res.ok) return res;
  const body = await readResponseBody(res);
  const err = (body as GoogleErrorEnvelope)?.error;
  const status = err?.status;
  const message = err?.message ?? "";

  let hint = "";
  if (res.status === 401 || status === "UNAUTHENTICATED") {
    hint =
      " — the access token is expired or invalid. A Zapier-managed connection refreshes it automatically; a direct env token must be reissued.";
  } else if (res.status === 403 || status === "PERMISSION_DENIED") {
    hint =
      " — the connected account lacks access to this property, or the token is missing the required scope. Grant the account access in GA4 Admin (and reconnect with edit access for write tools). Do not retry without fixing access.";
  } else if (res.status === 429 || status === "RESOURCE_EXHAUSTED") {
    hint =
      " — the property's Data API quota is exhausted. Back off and retry later; set returnPropertyQuota on runReport to read the remaining balance.";
  } else if (res.status === 400 && /incompatible/i.test(message)) {
    hint =
      " — the dimensions and/or metrics can't be combined. Run checkCompatibility to find the incompatible fields, drop them, and retry.";
  }

  throw ConnectorHttpError.fromResponseBody(res, body, {
    message: `Google Analytics ${toolName} failed${hint}`,
  });
}
