import { describe, expect, it } from "vitest";

import createWorkItem from "../scripts/createWorkItem.ts";

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

const TYPE_RESOLVE = {
  data: {
    namespace: {
      workItemTypes: {
        nodes: [{ id: "gid://gitlab/WorkItems::Type/1", name: "Task" }],
      },
    },
  },
};

const MUTATION_OK = {
  data: {
    workItemCreate: {
      workItem: {
        id: "gid://gitlab/WorkItem/9",
        iid: "9",
        title: "New task",
        state: "opened",
        webUrl: "https://gitlab.com/g/p/-/work_items/9",
        workItemType: { name: "Task" },
      },
      errors: [],
    },
  },
};

describe("createWorkItem: run", () => {
  it("resolves the type name to a gid, then POSTs the mutation with workItemTypeId", async () => {
    let count = 0;
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      count += 1;
      calls.push({ url, init });
      return jsonResponse(count === 1 ? TYPE_RESOLVE : MUTATION_OK);
    }) as typeof globalThis.fetch;

    const { data } = await createWorkItem.run(
      createWorkItem.inputSchema.parse({
        namespacePath: "group/project",
        workItemType: "Task",
        title: "New task",
        description: "the body",
      }),
      { fetch: fakeFetch },
    );

    expect(count).toBe(2);
    expect(calls[0]?.url).toBe("https://gitlab.com/api/graphql");
    expect(calls[1]?.url).toBe("https://gitlab.com/api/graphql");

    const typeBody = JSON.parse(calls[0]?.init?.body as string);
    expect(typeBody.query).toContain("query WorkItemTypes");

    const mutBody = JSON.parse(calls[1]?.init?.body as string);
    expect(mutBody.query).toContain("mutation CreateWorkItem");
    expect(mutBody.variables.input.workItemTypeId).toBe(
      "gid://gitlab/WorkItems::Type/1",
    );
    expect(mutBody.variables.input.title).toBe("New task");
    expect(mutBody.variables.input.descriptionWidget).toEqual({
      description: "the body",
    });

    expect(data).toMatchObject({
      id: "gid://gitlab/WorkItem/9",
      title: "New task",
    });
    expect(data.workItemType).toBe("Task");
    expect(createWorkItem.outputSchema.safeParse(data).success).toBe(true);
  });

  it("throws when the requested type name is not available", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        data: {
          namespace: {
            workItemTypes: {
              nodes: [{ id: "gid://gitlab/WorkItems::Type/2", name: "Issue" }],
            },
          },
        },
      })) as typeof globalThis.fetch;

    await expect(
      createWorkItem.run(
        createWorkItem.inputSchema.parse({
          namespacePath: "group/project",
          workItemType: "Epic",
          title: "x",
        }),
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/not available/);
  });

  it("throws when the mutation payload carries errors", async () => {
    let count = 0;
    const fakeFetch: typeof globalThis.fetch = (async () => {
      count += 1;
      return jsonResponse(
        count === 1
          ? TYPE_RESOLVE
          : {
              data: {
                workItemCreate: { workItem: null, errors: ["boom"] },
              },
            },
      );
    }) as typeof globalThis.fetch;

    await expect(
      createWorkItem.run(
        createWorkItem.inputSchema.parse({
          namespacePath: "group/project",
          workItemType: "Task",
          title: "x",
        }),
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/boom/);
  });
});
