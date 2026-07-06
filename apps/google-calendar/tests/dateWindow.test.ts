import { describe, expect, it } from "vitest";

import {
  isPlainDate,
  plainDateToStartOfDay,
  zoneOffset,
} from "../lib/google-calendar.ts";

describe("isPlainDate", () => {
  it("accepts a bare calendar date and rejects timestamps", () => {
    expect(isPlainDate("2026-07-03")).toBe(true);
    expect(isPlainDate("2026-07-03T00:00:00Z")).toBe(false);
    expect(isPlainDate("2026-07-03T00:00:00-07:00")).toBe(false);
    expect(isPlainDate("not-a-date")).toBe(false);
  });

  it("rejects shape-valid but impossible dates", () => {
    expect(isPlainDate("2026-13-40")).toBe(false);
    expect(isPlainDate("2026-02-30")).toBe(false);
    expect(isPlainDate("2026-00-00")).toBe(false);
  });
});

describe("zoneOffset", () => {
  it("tracks DST for a northern-hemisphere zone", () => {
    // America/Los_Angeles: PDT in July, PST in January.
    expect(zoneOffset("2026-07-03", "America/Los_Angeles")).toBe("-07:00");
    expect(zoneOffset("2026-01-03", "America/Los_Angeles")).toBe("-08:00");
  });

  it("handles half-hour zones and UTC", () => {
    expect(zoneOffset("2026-07-03", "Asia/Kolkata")).toBe("+05:30");
    expect(zoneOffset("2026-07-03", "UTC")).toBe("+00:00");
  });

  it("falls back to +00:00 on an invalid timezone instead of throwing", () => {
    expect(zoneOffset("2026-07-03", "America/Los_Angles")).toBe("+00:00");
    expect(zoneOffset("2026-07-03", "Not/AZone")).toBe("+00:00");
  });

  it("uses the offset at local midnight on DST-transition days", () => {
    // Spring-forward day: DST begins at 2am, so midnight is still PST (-08:00).
    expect(zoneOffset("2026-03-08", "America/Los_Angeles")).toBe("-08:00");
    // Fall-back day: DST ends at 2am, so midnight is still PDT (-07:00).
    expect(zoneOffset("2026-11-01", "America/Los_Angeles")).toBe("-07:00");
  });
});

describe("plainDateToStartOfDay", () => {
  it("builds an RFC3339 start-of-day with the zone's offset", () => {
    expect(plainDateToStartOfDay("2026-07-03", "America/Los_Angeles")).toBe(
      "2026-07-03T00:00:00-07:00",
    );
    expect(plainDateToStartOfDay("2026-01-03", "America/New_York")).toBe(
      "2026-01-03T00:00:00-05:00",
    );
  });
});
