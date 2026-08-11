import { describe, expect, it } from "vitest";

import updateWorkItem from "../scripts/updateWorkItem.ts";

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({
      "content-type": "application/json",
      ...init.headers,
    }),
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response;
}

const MUTATION_OK = {
  data: {
    workItemUpdate: {
      workItem: {
        id: "gid://gitlab/WorkItem/9",
        iid: "9",
        title: "Renamed",
        state: "opened",
        webUrl: "https://gitlab.com/g/p/-/work_items/9",
      },
      errors: [],
    },
  },
};

describe("updateWorkItem: run", () => {
  it("POSTs a single mutation with only the supplied fields (no descriptionWidget when description omitted)", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(MUTATION_OK);
    }) as typeof globalThis.fetch;

    const { data } = await updateWorkItem.run(
      updateWorkItem.inputSchema.parse({
        id: "gid://gitlab/WorkItem/9",
        title: "Renamed",
      }),
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://gitlab.com/api/graphql");
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.query).toContain("mutation UpdateWorkItem");
    expect(body.variables.input).toEqual({
      id: "gid://gitlab/WorkItem/9",
      title: "Renamed",
    });
    expect(body.variables.input.descriptionWidget).toBeUndefined();
    expect(data).toMatchObject({
      id: "gid://gitlab/WorkItem/9",
      title: "Renamed",
    });
    expect(updateWorkItem.outputSchema.safeParse(data).success).toBe(true);
  });

  it("includes descriptionWidget and stateEvent when supplied", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(MUTATION_OK);
    }) as typeof globalThis.fetch;

    await updateWorkItem.run(
      updateWorkItem.inputSchema.parse({
        id: "gid://gitlab/WorkItem/9",
        description: "new body",
        stateEvent: "CLOSE",
      }),
      { fetch: fakeFetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.variables.input).toEqual({
      id: "gid://gitlab/WorkItem/9",
      stateEvent: "CLOSE",
      descriptionWidget: { description: "new body" },
    });
  });

  it("throws when the mutation payload carries errors", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        data: {
          workItemUpdate: { workItem: null, errors: ["nope"] },
        },
      })) as typeof globalThis.fetch;

    await expect(
      updateWorkItem.run(
        updateWorkItem.inputSchema.parse({
          id: "gid://gitlab/WorkItem/9",
          title: "x",
        }),
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/nope/);
  });
});
