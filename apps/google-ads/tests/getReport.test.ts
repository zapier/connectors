import { describe, expect, it } from "vitest";

import getReportDefinition from "../scripts/getReport.ts";
import { recordingFetch } from "./helpers.ts";

const { inputSchema, outputSchema } = getReportDefinition;

describe("getReport: inputSchema", () => {
  it("requires at least one metric", () => {
    expect(
      inputSchema.safeParse({
        customerId: "1",
        resource: "campaign",
        metrics: [],
      }).success,
    ).toBe(false);
  });
  it("rejects datePreset together with a custom range", () => {
    expect(
      inputSchema.safeParse({
        customerId: "1",
        resource: "campaign",
        metrics: ["clicks"],
        datePreset: "LAST_7_DAYS",
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      }).success,
    ).toBe(false);
  });
  it("rejects startDate without endDate", () => {
    expect(
      inputSchema.safeParse({
        customerId: "1",
        resource: "campaign",
        metrics: ["clicks"],
        startDate: "2026-01-01",
      }).success,
    ).toBe(false);
  });
});

describe("getReport: run", () => {
  it("assembles a GAQL query with metrics, segments, the default range, and a LIMIT", async () => {
    const { fetch, calls } = recordingFetch({
      results: [
        {
          campaign: { id: "1" },
          metrics: { clicks: "10" },
          segments: { date: "2026-06-01" },
        },
      ],
      nextPageToken: "N",
    });

    const { data: result } = await getReportDefinition.run(
      {
        customerId: "1",
        resource: "campaign",
        metrics: ["clicks", "cost_micros"],
        segments: ["date"],
      },
      { fetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string) as {
      query: string;
    };
    expect(body.query).toContain("metrics.clicks");
    expect(body.query).toContain("metrics.cost_micros");
    expect(body.query).toContain("segments.date");
    expect(body.query).toContain("FROM campaign");
    expect(body.query).toContain("DURING LAST_30_DAYS"); // default range
    expect(body.query).toContain("LIMIT 50"); // default soft limit
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.next_page_token).toBe("N");
  });

  it("uses a BETWEEN clause for a custom range", async () => {
    const { fetch, calls } = recordingFetch({ results: [] });
    await getReportDefinition.run(
      {
        customerId: "1",
        resource: "campaign",
        metrics: ["clicks"],
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        limit: 5,
      },
      { fetch },
    );
    const body = JSON.parse(calls[0]?.init?.body as string) as {
      query: string;
    };
    expect(body.query).toContain(
      "segments.date BETWEEN '2026-01-01' AND '2026-01-31'",
    );
    expect(body.query).toContain("LIMIT 5");
  });
});
