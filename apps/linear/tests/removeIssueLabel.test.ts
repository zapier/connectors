import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import removeIssueLabelDefinition from "../scripts/removeIssueLabel.ts";

const { inputSchema, outputSchema } = removeIssueLabelDefinition;

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

const LABEL_ID = "aaaaaaaa-bbbb-4bbb-8bbb-cccccccccccc";
const ISSUE = {
  id: "1429989f-e8ac-4eff-bc8f-57f56486db54",
  identifier: "ENG-118",
  title: "Some issue",
  url: "https://linear.app/acme/issue/ENG-118",
};

describe("removeIssueLabel: inputSchema", () => {
  it("requires issueId and labelId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ issueId: "ENG-118" }).success).toBe(false);
    expect(
      inputSchema.safeParse({ issueId: "ENG-118", labelId: LABEL_ID }).success,
    ).toBe(true);
  });

  it("rejects a non-UUID labelId", () => {
    expect(
      inputSchema.safeParse({ issueId: "ENG-118", labelId: "not-a-uuid" })
        .success,
    ).toBe(false);
  });
});

describe("removeIssueLabel: governance", () => {
  it("is a non-destructive, idempotent write", () => {
    expect(removeIssueLabelDefinition.annotations?.readOnlyHint).toBe(false);
    expect(removeIssueLabelDefinition.annotations?.destructiveHint).toBe(false);
    expect(removeIssueLabelDefinition.annotations?.idempotentHint).toBe(true);
  });
});

describe("removeIssueLabel: run", () => {
  it("POSTs the IssueRemoveLabel mutation and returns the parsed issue", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: { issueRemoveLabel: { success: true, issue: ISSUE } },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await removeIssueLabelDefinition.run(
      { issueId: "ENG-118", labelId: LABEL_ID },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.linear.app/graphql");
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.query).toContain("IssueRemoveLabel");
    expect(body.variables.id).toBe("ENG-118");
    expect(body.variables.labelId).toBe(LABEL_ID);
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.identifier).toBe("ENG-118");
  });

  it("throws a ConnectorHttpError when Linear returns an errors array", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [{ message: "nope" }],
      })) as typeof globalThis.fetch;

    const err = await removeIssueLabelDefinition
      .run({ issueId: "ENG-118", labelId: LABEL_ID }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).message).toContain("nope");
  });
});
