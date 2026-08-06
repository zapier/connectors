import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createAttachmentDefinition from "../scripts/createAttachment.ts";

const { inputSchema, outputSchema } = createAttachmentDefinition;

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

const ATTACHMENT = {
  id: "1429989f-e8ac-4eff-bc8f-57f56486db54",
  url: "https://github.com/acme/repo/pull/42",
  title: "PR #42",
};

describe("createAttachment: inputSchema", () => {
  it("requires issueId and url", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ issueId: "ENG-118" }).success).toBe(false);
    expect(
      inputSchema.safeParse({
        issueId: "ENG-118",
        url: "https://example.com",
      }).success,
    ).toBe(true);
  });
});

describe("createAttachment: governance", () => {
  it("is a non-destructive, non-idempotent write", () => {
    expect(createAttachmentDefinition.annotations?.readOnlyHint).toBe(false);
    expect(createAttachmentDefinition.annotations?.destructiveHint).toBe(false);
    expect(createAttachmentDefinition.annotations?.idempotentHint).toBe(false);
  });
});

describe("createAttachment: run", () => {
  it("POSTs the AttachmentCreate mutation with only set fields and returns the parsed attachment", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: { attachmentCreate: { success: true, attachment: ATTACHMENT } },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await createAttachmentDefinition.run(
      {
        issueId: "ENG-118",
        url: "https://github.com/acme/repo/pull/42",
        title: "PR #42",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.linear.app/graphql");
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.query).toContain("AttachmentCreate");
    expect(body.variables.input.issueId).toBe("ENG-118");
    expect(body.variables.input.url).toBe(
      "https://github.com/acme/repo/pull/42",
    );
    expect(body.variables.input.title).toBe("PR #42");
    // Unset optional must not be sent.
    expect("subtitle" in body.variables.input).toBe(false);
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(ATTACHMENT.id);
  });

  it("throws a ConnectorHttpError when Linear returns an errors array", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [{ message: "nope" }],
      })) as typeof globalThis.fetch;

    const err = await createAttachmentDefinition
      .run(
        { issueId: "ENG-118", url: "https://example.com" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).message).toContain("nope");
  });
});
