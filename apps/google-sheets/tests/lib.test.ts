import { describe, expect, it } from "vitest";

import {
  a1ToGridRange,
  buildRange,
  columnIndexToLetter,
  columnLetterToIndex,
  quoteSheetName,
} from "../lib/a1.ts";
import {
  buildUpdateRuns,
  parseFirstRowNumber,
  recordToAppendCells,
  rowToRecord,
} from "../lib/headers.ts";
import { normalizeSpreadsheetId } from "../lib/spreadsheetId.ts";

describe("a1: column letter <-> index", () => {
  it("maps 0-based index to letters", () => {
    expect(columnIndexToLetter(0)).toBe("A");
    expect(columnIndexToLetter(25)).toBe("Z");
    expect(columnIndexToLetter(26)).toBe("AA");
    expect(columnIndexToLetter(27)).toBe("AB");
    expect(columnIndexToLetter(701)).toBe("ZZ");
  });
  it("maps letters back to 0-based index (round-trip)", () => {
    for (const i of [0, 25, 26, 27, 701, 18277]) {
      expect(columnLetterToIndex(columnIndexToLetter(i))).toBe(i);
    }
  });
});

describe("a1: quoting and range building", () => {
  it("single-quotes and doubles embedded apostrophes", () => {
    expect(quoteSheetName("Sheet1")).toBe("'Sheet1'");
    expect(quoteSheetName("My Sheet")).toBe("'My Sheet'");
    expect(quoteSheetName("Jon's Data")).toBe("'Jon''s Data'");
  });
  it("builds a sheet-qualified range", () => {
    expect(buildRange("My Sheet", "A1:C10")).toBe("'My Sheet'!A1:C10");
  });
});

describe("a1: A1 -> GridRange", () => {
  it("converts a bounded range (half-open end)", () => {
    expect(a1ToGridRange(42, "A1:C10")).toEqual({
      sheetId: 42,
      startRowIndex: 0,
      endRowIndex: 10,
      startColumnIndex: 0,
      endColumnIndex: 3,
    });
  });
  it("whole column A:A omits row bounds", () => {
    expect(a1ToGridRange(1, "A:A")).toEqual({
      sheetId: 1,
      startColumnIndex: 0,
      endColumnIndex: 1,
    });
  });
  it("whole row 2:2 omits column bounds", () => {
    expect(a1ToGridRange(1, "2:2")).toEqual({
      sheetId: 1,
      startRowIndex: 1,
      endRowIndex: 2,
    });
  });
  it("single cell expands to a 1x1 range", () => {
    expect(a1ToGridRange(1, "B5")).toEqual({
      sheetId: 1,
      startRowIndex: 4,
      endRowIndex: 5,
      startColumnIndex: 1,
      endColumnIndex: 2,
    });
  });
});

describe("headers: rowToRecord pads ragged rows", () => {
  it("maps cells to headers and pads missing trailing cells", () => {
    expect(rowToRecord(["Name", "Age", "City"], ["Sam", "30"])).toEqual({
      Name: "Sam",
      Age: "30",
      City: "",
    });
  });
  it("skips empty header columns", () => {
    expect(rowToRecord(["Name", "", "City"], ["Sam", "x", "NYC"])).toEqual({
      Name: "Sam",
      City: "NYC",
    });
  });
});

describe("headers: recordToAppendCells", () => {
  it("orders cells by header position, blank-filling unnamed columns", () => {
    expect(
      recordToAppendCells(["Name", "Age", "City"], {
        Name: "Sam",
        City: "NYC",
      }),
    ).toEqual(["Sam", "", "NYC"]);
  });
  it("throws on an unknown header", () => {
    expect(() => recordToAppendCells(["Name"], { Nope: "x" })).toThrow(
      /Unknown column header/,
    );
  });
});

describe("headers: buildUpdateRuns (no-clobber, PLAN §3k)", () => {
  const headers = ["A", "B", "C", "D"]; // header labels happen to be column letters here

  it("collapses adjacent named columns into one run", () => {
    const runs = buildUpdateRuns(headers, { A: "1", B: "2" }, 5, "Sheet1");
    expect(runs).toHaveLength(1);
    expect(runs[0].range).toBe("'Sheet1'!A5:B5");
    expect(runs[0].values).toEqual([["1", "2"]]);
  });

  it("splits non-adjacent named columns into separate runs (never spans the gap)", () => {
    const runs = buildUpdateRuns(headers, { A: "1", D: "4" }, 5, "Sheet1");
    expect(runs).toHaveLength(2);
    expect(runs.map((r) => r.range)).toEqual([
      "'Sheet1'!A5:A5",
      "'Sheet1'!D5:D5",
    ]);
    // Critically: column B and C are NOT in any run, so they are never written/blanked.
    expect(runs.flatMap((r) => r.values[0])).toEqual(["1", "4"]);
  });

  it("orders runs by column regardless of input key order", () => {
    const runs = buildUpdateRuns(headers, { D: "4", A: "1" }, 2, "S");
    expect(runs.map((r) => r.range)).toEqual(["'S'!A2:A2", "'S'!D2:D2"]);
  });
});

describe("headers: parseFirstRowNumber", () => {
  it("parses the first row number from an updatedRange", () => {
    expect(parseFirstRowNumber("'Sheet1'!A5:G5")).toBe(5);
    expect(parseFirstRowNumber("Sheet1!A12:C13")).toBe(12);
  });
  it("throws on an unparseable range", () => {
    expect(() => parseFirstRowNumber("garbage")).toThrow();
  });
});

describe("spreadsheetId: normalizeSpreadsheetId", () => {
  it("extracts the id from a full Sheets URL", () => {
    expect(
      normalizeSpreadsheetId(
        "https://docs.google.com/spreadsheets/d/1AbC-_dEf/edit#gid=0",
      ),
    ).toBe("1AbC-_dEf");
  });
  it("returns a bare id unchanged (trimmed)", () => {
    expect(normalizeSpreadsheetId("  1AbC-_dEf  ")).toBe("1AbC-_dEf");
  });
});
