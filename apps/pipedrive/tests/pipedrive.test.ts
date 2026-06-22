import { describe, expect, it } from "vitest";

import { toRfc3339 } from "../lib/pipedrive.ts";

describe("toRfc3339", () => {
  it("normalizes a v1 space-separated timestamp to RFC-3339 UTC", () => {
    expect(toRfc3339("2026-01-01 00:00:00")).toBe("2026-01-01T00:00:00Z");
    expect(toRfc3339("2026-07-31 13:45:09")).toBe("2026-07-31T13:45:09Z");
  });

  it("passes an already-RFC-3339 string through untouched", () => {
    expect(toRfc3339("2026-01-01T00:00:00Z")).toBe("2026-01-01T00:00:00Z");
    expect(toRfc3339("2026-01-01T00:00:00+02:00")).toBe(
      "2026-01-01T00:00:00+02:00",
    );
  });

  it("passes null and undefined through untouched", () => {
    expect(toRfc3339(null)).toBe(null);
    expect(toRfc3339(undefined)).toBe(undefined);
  });

  it("passes non-date strings and non-string values through untouched", () => {
    expect(toRfc3339("not a date")).toBe("not a date");
    expect(toRfc3339(42)).toBe(42);
    expect(toRfc3339("2026-01-01")).toBe("2026-01-01");
  });
});
