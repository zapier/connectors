import {
  ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import { DropboxApiError, throwIfDropboxError } from "../lib/dropbox.ts";

function errorResponse(
  body: string,
  init: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {},
): Response {
  const status = init.status ?? 400;
  return {
    ok: false,
    status,
    statusText: init.statusText ?? "Bad Request",
    headers: new Headers(init.headers ?? {}),
    text: async () => body,
    json: async () => JSON.parse(body),
  } as unknown as Response;
}

describe("throwIfDropboxError: Dropbox JSON errors", () => {
  it("maps error_summary to summary + an actionable hint, and carries the body", async () => {
    const res = errorResponse(
      JSON.stringify({ error_summary: "path/not_found/." }),
      {
        headers: { "content-type": "application/json" },
      },
    );

    const err = await throwIfDropboxError("getFileMetadata", res).then(
      () => null,
      (e: unknown) => e,
    );

    expect(err).toBeInstanceOf(DropboxApiError);
    const dbx = err as DropboxApiError;
    expect(dbx.summary).toBe("path/not_found/.");
    expect(dbx.status).toBe(400);
    expect(dbx.message).toContain("path/not_found");
    expect(dbx.message).toContain("File or folder not found"); // hint
    // Full response rides along for agents.
    expect(dbx.response.body).toEqual({ error_summary: "path/not_found/." });
    expect(dbx.response.status).toBe(400);
  });

  it("is recognized as a ConnectorHttpError (brand + instanceof)", async () => {
    const res = errorResponse(JSON.stringify({ error_summary: "x/y" }));
    const err = await throwIfDropboxError("t", res).catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    expect(err).toBeInstanceOf(ConnectorHttpError);
    expect((err as Error).name).toBe("DropboxApiError");
  });
});

describe("throwIfDropboxError: non-Dropbox relay/proxy errors (regression)", () => {
  it("surfaces a plain-text body + x-relay-error-code header instead of collapsing to 'unknown error'", async () => {
    // The exact failure that cost hours: relay DOMAIN_FILTER_MISMATCH — a plain-text
    // body with the machine code in a header. error_summary is absent.
    const res = errorResponse(
      "Domain content.dropboxapi.com did not match expected domain filter `api.dropboxapi.com`.",
      {
        headers: {
          "x-relay-error-code": "DOMAIN_FILTER_MISMATCH",
          "x-relay-error-retryable": "false",
        },
      },
    );

    const err = (await throwIfDropboxError("createTextFile", res).catch(
      (e: unknown) => e,
    )) as DropboxApiError;

    expect(err).toBeInstanceOf(DropboxApiError);
    expect(err.summary).toBe(""); // no Dropbox error_summary
    // The raw body and relay headers are now preserved on the error.
    expect(err.response.body).toContain("did not match expected domain filter");
    expect(err.response.headers["x-relay-error-code"]).toBe(
      "DOMAIN_FILTER_MISMATCH",
    );
    // toString() (what CLI/agents render) exposes both, not just "unknown error".
    const rendered = err.toString();
    expect(rendered).toContain("DOMAIN_FILTER_MISMATCH");
    expect(rendered).toContain("did not match expected domain filter");
  });
});

describe("DropboxApiError: soft-success detection still works", () => {
  it("preserves instanceof + summary for shared_link_already_exists", async () => {
    const res = errorResponse(
      JSON.stringify({ error_summary: "shared_link_already_exists/.." }),
      { status: 409, statusText: "Conflict" },
    );
    const err = await throwIfDropboxError("createSharedLink", res).catch(
      (e: unknown) => e,
    );
    expect(err instanceof DropboxApiError).toBe(true);
    expect(
      (err as DropboxApiError).summary.startsWith("shared_link_already_exists"),
    ).toBe(true);
  });
});
