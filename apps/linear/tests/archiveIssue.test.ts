import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import archiveIssueDefinition from "../scripts/archiveIssue.ts";

const { inputSchema, outputSchema } = archiveIssueDefinition;

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

describe("archiveIssue: inputSchema", () => {
  it("requires issueId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ issueId: "ENG-118" }).success).toBe(true);
  });
});

describe("archiveIssue: governance", () => {
  it("is a write but NOT destructive (archiving is reversible)", () => {
    expect(archiveIssueDefinition.annotations?.readOnlyHint).toBe(false);
    expect(archiveIssueDefinition.annotations?.destructiveHint).toBe(false);
    expect(archiveIssueDefinition.annotations?.idempotentHint).toBe(true);
  });
});

describe("archiveIssue: run", () => {
  it("POSTs the IssueArchive mutation and returns success", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ data: { issueArchive: { success: true } } });
    }) as typeof globalThis.fetch;

    const { data: result } = await archiveIssueDefinition.run(
      { issueId: "ENG-118" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.linear.app/graphql");
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.query).toContain("IssueArchive");
    expect(body.variables.id).toBe("ENG-118");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.success).toBe(true);
  });

  it("throws a ConnectorHttpError when Linear returns an errors array", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [{ message: "nope" }],
      })) as typeof globalThis.fetch;

    const err = await archiveIssueDefinition
      .run({ issueId: "ENG-118" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).message).toContain("nope");
  });
});
