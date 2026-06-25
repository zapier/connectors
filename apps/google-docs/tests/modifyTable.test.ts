import { describe, expect, it } from "vitest";

import modifyTableDefinition from "../scripts/modifyTable.ts";

const { inputSchema, outputSchema } = modifyTableDefinition;

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

interface Call {
  url: string;
  init: RequestInit | undefined;
}

interface TableRequest {
  insertTableRow?: { tableCellLocation?: unknown; insertBelow?: boolean };
  insertTableColumn?: { tableCellLocation?: unknown; insertRight?: boolean };
  deleteTableRow?: { tableCellLocation?: unknown };
  deleteTableColumn?: { tableCellLocation?: unknown };
}

function recordingFetch(calls: Call[]): typeof globalThis.fetch {
  return (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return jsonResponse({ replies: [{}] });
  }) as typeof globalThis.fetch;
}

function requestOf(call: Call | undefined): TableRequest {
  return (JSON.parse(String(call?.init?.body)) as { requests: TableRequest[] })
    .requests[0];
}

describe("modifyTable: inputSchema", () => {
  it("requires documentId, tableStartIndex, op, rowIndex, columnIndex", () => {
    expect(
      inputSchema.safeParse({ documentId: "d", tableStartIndex: 5 }).success,
    ).toBe(false);
    expect(
      inputSchema.safeParse({
        documentId: "d",
        tableStartIndex: 5,
        op: "insertRow",
        rowIndex: 0,
        columnIndex: 0,
      }).success,
    ).toBe(true);
  });
});

describe("modifyTable: governance", () => {
  it("is marked destructive (delete ops remove rows/columns)", () => {
    expect(modifyTableDefinition.annotations?.destructiveHint).toBe(true);
  });
});

describe("modifyTable: run", () => {
  it("insertRow: builds the tableCellLocation and insertBelow default true", async () => {
    const calls: Call[] = [];
    const { data: result } = await modifyTableDefinition.run(
      {
        documentId: "d1",
        tableStartIndex: 5,
        op: "insertRow",
        rowIndex: 1,
        columnIndex: 0,
        insertBelow: true,
        insertRight: true,
        tabId: "t.0",
      },
      { fetch: recordingFetch(calls) },
    );

    const req = requestOf(calls[0]);
    expect(req.insertTableRow?.insertBelow).toBe(true);
    expect(req.insertTableRow?.tableCellLocation).toEqual({
      tableStartLocation: { index: 5, tabId: "t.0" },
      rowIndex: 1,
      columnIndex: 0,
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("deleteColumn: emits a deleteTableColumn at the reference cell", async () => {
    const calls: Call[] = [];
    await modifyTableDefinition.run(
      {
        documentId: "d1",
        tableStartIndex: 5,
        op: "deleteColumn",
        rowIndex: 0,
        columnIndex: 2,
        insertBelow: true,
        insertRight: true,
      },
      { fetch: recordingFetch(calls) },
    );
    const req = requestOf(calls[0]);
    expect(req.deleteTableColumn?.tableCellLocation).toEqual({
      tableStartLocation: { index: 5 },
      rowIndex: 0,
      columnIndex: 2,
    });
  });
});
