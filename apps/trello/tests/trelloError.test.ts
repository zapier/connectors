import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import { trelloError } from "../lib/trello.ts";

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

describe("trelloError", () => {
  it("throws a ConnectorHttpError carrying the full response (status, headers, body)", async () => {
    const res = errorResponse(JSON.stringify({ message: "invalid value" }), {
      status: 400,
      headers: { "x-request-id": "req-9" },
    });

    const err = (await trelloError("createCard", res).catch(
      (e: unknown) => e,
    )) as ConnectorHttpError;

    expect(isConnectorHttpError(err)).toBe(true);
    expect(err.response.status).toBe(400);
    expect(err.response.body).toEqual({ message: "invalid value" });
    expect(err.response.headers["x-request-id"]).toBe("req-9");
    // The call site is named and the status rendered; the body rides along.
    expect(err.message).toContain("Trello createCard 400");
  });

  it("surfaces an unrecognized (non-JSON edge/proxy) error body intact in toString()", async () => {
    const res = errorResponse("upstream connect error or disconnect/reset", {
      status: 502,
      statusText: "Bad Gateway",
    });

    const err = (await trelloError("searchCards", res).catch(
      (e: unknown) => e,
    )) as ConnectorHttpError;

    expect(err.response.body).toBe(
      "upstream connect error or disconnect/reset",
    );
    const rendered = err.toString();
    expect(rendered).toContain("status: 502 Bad Gateway");
    expect(rendered).toContain("upstream connect error");
  });

  it("adds an actionable hint for 404 and 401", async () => {
    const notFound = (await trelloError(
      "getCard",
      errorResponse("{}", { status: 404 }),
    ).catch((e: unknown) => e)) as Error;
    expect(notFound.message).toContain("verify the id exists");

    const unauth = (await trelloError(
      "getCard",
      errorResponse("{}", { status: 401 }),
    ).catch((e: unknown) => e)) as Error;
    expect(unauth.message).toContain("Trello auth credentials");
  });
});
