import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getViewerDefinition from "../scripts/getViewer.ts";

const { inputSchema, outputSchema } = getViewerDefinition;

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

const VIEWER = {
  data: {
    viewer: {
      id: "88888888-8888-8888-8888-888888888888",
      name: "Ada Lovelace",
      email: "ada@example.com",
      displayName: "ada",
    },
  },
};

describe("getViewer: inputSchema", () => {
  it("accepts an empty input and rejects unknown keys", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
    expect(inputSchema.safeParse({ foo: "bar" }).success).toBe(false);
  });
});

describe("getViewer: governance", () => {
  it("is read-only", () => {
    expect(getViewerDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getViewerDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getViewer: run", () => {
  it("posts the Viewer query and returns the viewer object", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(VIEWER);
    }) as typeof globalThis.fetch;

    const { data: result } = await getViewerDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.linear.app/graphql");
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.query).toContain("viewer { id name email displayName }");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(VIEWER.data.viewer.id);
  });

  it("throws a ConnectorHttpError when Linear returns an errors[] array", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [
          {
            message: "Authentication required",
            extensions: { type: "authentication error" },
          },
        ],
      })) as typeof globalThis.fetch;

    const err = await getViewerDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
