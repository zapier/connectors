import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import { googleAdsRequest } from "../lib/googleAdsFetch.ts";
import { googleAdsErrorBody, jsonResponse } from "./helpers.ts";

describe("googleAdsRequest error path", () => {
  it("throws a ConnectorHttpError carrying the full GoogleAdsFailure body", async () => {
    const body = googleAdsErrorBody(
      { authorizationError: "USER_PERMISSION_DENIED" },
      "User doesn't have permission to access customer.",
    );
    const fetch = (async () =>
      jsonResponse(body, { status: 403 })) as typeof globalThis.fetch;

    const err = (await googleAdsRequest(fetch, {
      path: "/customers/1/googleAds:search",
      toolName: "search",
    }).catch((e: unknown) => e)) as ConnectorHttpError;

    expect(isConnectorHttpError(err)).toBe(true);
    expect(err.response.status).toBe(403);
    expect(err.response.body).toEqual(body);
    // The actionable hint is preserved on the one-line message.
    expect(err.message).toContain("loginCustomerId");
  });

  it("surfaces an unrecognized (non-envelope) error body intact", async () => {
    const fetch = (async () =>
      jsonResponse("upstream request timeout", {
        status: 504,
      })) as typeof globalThis.fetch;

    const err = (await googleAdsRequest(fetch, {
      path: "/customers/1/googleAds:search",
      toolName: "search",
    }).catch((e: unknown) => e)) as ConnectorHttpError;

    expect(err.response.body).toBe("upstream request timeout");
    expect(err.toString()).toContain("upstream request timeout");
  });
});
