import { describe, expect, it } from "vitest";

import listSearchableFieldsDefinition from "../scripts/listSearchableFields.ts";
import { recordingFetch } from "./helpers.ts";

const { outputSchema } = listSearchableFieldsDefinition;

describe("listSearchableFields: run", () => {
  it("builds a field-service query from the resource prefix and maps dataType -> data_type", async () => {
    const { fetch, calls } = recordingFetch({
      results: [
        {
          name: "campaign.status",
          category: "ATTRIBUTE",
          selectable: true,
          filterable: true,
          sortable: true,
          dataType: "ENUM",
        },
      ],
      nextPageToken: "P2",
    });

    const { data: result } = await listSearchableFieldsDefinition.run(
      { resource: "campaign" },
      { fetch },
    );

    expect(calls[0]?.url).toBe(
      "https://googleads.googleapis.com/v23/googleAdsFields:search",
    );
    const body = JSON.parse(calls[0]?.init?.body as string) as {
      query: string;
    };
    expect(body.query).toContain("WHERE name LIKE 'campaign.%'");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.results[0]).toMatchObject({
      name: "campaign.status",
      data_type: "ENUM",
    });
    expect(result.next_page_token).toBe("P2");
  });
});
