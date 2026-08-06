import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createCommentDefinition from "../scripts/createComment.ts";

const { inputSchema, outputSchema } = createCommentDefinition;

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

const COMMENT = {
  id: "1429989f-e8ac-4eff-bc8f-57f56486db54",
  url: "https://linear.app/acme/issue/ENG-118#comment-abc",
};

describe("createComment: inputSchema", () => {
  it("requires issueId and body", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ issueId: "ENG-118" }).success).toBe(false);
    expect(
      inputSchema.safeParse({ issueId: "ENG-118", body: "Looks good" }).success,
    ).toBe(true);
  });
});

describe("createComment: governance", () => {
  it("is a non-destructive, non-idempotent write", () => {
    expect(createCommentDefinition.annotations?.readOnlyHint).toBe(false);
    expect(createCommentDefinition.annotations?.destructiveHint).toBe(false);
    expect(createCommentDefinition.annotations?.idempotentHint).toBe(false);
  });
});

describe("createComment: run", () => {
  it("POSTs the CommentCreate mutation and returns the parsed comment", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: { commentCreate: { success: true, comment: COMMENT } },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await createCommentDefinition.run(
      { issueId: "ENG-118", body: "Looks good" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.linear.app/graphql");
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.query).toContain("CommentCreate");
    expect(body.variables.input.issueId).toBe("ENG-118");
    expect(body.variables.input.body).toBe("Looks good");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(COMMENT.id);
  });

  it("throws a ConnectorHttpError when Linear returns an errors array", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [{ message: "nope" }],
      })) as typeof globalThis.fetch;

    const err = await createCommentDefinition
      .run({ issueId: "ENG-118", body: "x" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).message).toContain("nope");
  });
});
