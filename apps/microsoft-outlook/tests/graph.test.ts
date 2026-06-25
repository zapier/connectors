import { describe, expect, it } from "vitest";

import { stripNullsDeep } from "../lib/graph.ts";

describe("stripNullsDeep", () => {
  it("drops null and undefined keys but preserves falsy non-null values", () => {
    expect(
      stripNullsDeep({ a: null, b: undefined, c: false, d: 0, e: "", f: "x" }),
    ).toEqual({ c: false, d: 0, e: "", f: "x" });
  });

  it("recurses into nested objects and arrays", () => {
    expect(
      stripNullsDeep({
        keep: { x: 1, drop: null },
        list: [{ y: null, z: 2 }, { w: "ok" }],
      }),
    ).toEqual({ keep: { x: 1 }, list: [{ z: 2 }, { w: "ok" }] });
  });

  it("returns primitives unchanged", () => {
    expect(stripNullsDeep("hi")).toBe("hi");
    expect(stripNullsDeep(0)).toBe(0);
    expect(stripNullsDeep(false)).toBe(false);
  });
});
