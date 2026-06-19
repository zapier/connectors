#!/usr/bin/env node
// Authored by the implementation agent: every structural Sheets tool POSTs the same
// /{id}:batchUpdate path with a different requests[] member, so setDataValidation is
// authored directly.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { a1ToGridRange } from "../lib/a1.ts";
import { SHEETS_BASE } from "../lib/constants.ts";
import { resolveSheetId } from "../lib/headers.ts";
import { googleSheetsFetch } from "../lib/sheetsFetch.ts";
import { normalizeSpreadsheetId } from "../lib/spreadsheetId.ts";

const inputSchema = z
  .object({
    spreadsheet: z
      .string()
      .describe(
        "Spreadsheet id, or a full Google Sheets URL (the connector extracts the id).",
      ),
    worksheet: z
      .string()
      .describe("Title of the worksheet containing the range."),
    range: z
      .string()
      .describe(
        'A1 range to apply the rule to, without the sheet prefix (e.g. "A2:A100").',
      ),
    rule_type: z
      .enum(["ONE_OF_LIST", "NUMBER_GREATER", "NUMBER_BETWEEN", "DATE_BETWEEN"])
      .describe(
        "Validation rule: ONE_OF_LIST (dropdown), NUMBER_GREATER, NUMBER_BETWEEN, or DATE_BETWEEN.",
      ),
    list_values: z
      .array(z.string())
      .optional()
      .describe("Dropdown options. Required when rule_type is ONE_OF_LIST."),
    min_number: z
      .number()
      .optional()
      .describe(
        "Lower bound. Required for NUMBER_GREATER; lower bound for NUMBER_BETWEEN.",
      ),
    max_number: z
      .number()
      .optional()
      .describe("Upper bound. Required for NUMBER_BETWEEN."),
    start_date: z
      .string()
      .optional()
      .describe("Start date YYYY-MM-DD. Required for DATE_BETWEEN."),
    end_date: z
      .string()
      .optional()
      .describe("End date YYYY-MM-DD. Required for DATE_BETWEEN."),
    strict: z
      .boolean()
      .optional()
      .describe("Reject invalid input (true) or just warn (default false)."),
    show_dropdown: z
      .boolean()
      .optional()
      .describe("Show the dropdown chip for ONE_OF_LIST (default true)."),
  })
  .strict();

const outputSchema = z.object({
  validated_range: z
    .string()
    .describe("The A1 range the validation rule was applied to."),
});

const definition = defineTool({
  name: "setDataValidation",
  title: "Set Data Validation",
  description:
    "Set a data-validation rule (dropdown list, number constraint, or date range) on a cell range.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-sheets",
  run: async (input, ctx) => {
    const spreadsheetId = normalizeSpreadsheetId(input.spreadsheet);
    const strict = input.strict ?? false;
    const showDropdown = input.show_dropdown ?? true;

    let condition: { type: string; values?: { userEnteredValue: string }[] };
    let showCustomUi: boolean | undefined;

    switch (input.rule_type) {
      case "ONE_OF_LIST": {
        if (!input.list_values || input.list_values.length === 0) {
          throw new Error(
            "rule_type ONE_OF_LIST requires a non-empty list_values array (the dropdown options).",
          );
        }
        condition = {
          type: "ONE_OF_LIST",
          values: input.list_values.map((v) => ({ userEnteredValue: v })),
        };
        showCustomUi = showDropdown;
        break;
      }
      case "NUMBER_GREATER": {
        if (input.min_number === undefined) {
          throw new Error("rule_type NUMBER_GREATER requires min_number.");
        }
        condition = {
          type: "NUMBER_GREATER",
          values: [{ userEnteredValue: String(input.min_number) }],
        };
        break;
      }
      case "NUMBER_BETWEEN": {
        if (input.min_number === undefined || input.max_number === undefined) {
          throw new Error(
            "rule_type NUMBER_BETWEEN requires both min_number and max_number.",
          );
        }
        condition = {
          type: "NUMBER_BETWEEN",
          values: [
            { userEnteredValue: String(input.min_number) },
            { userEnteredValue: String(input.max_number) },
          ],
        };
        break;
      }
      case "DATE_BETWEEN": {
        if (input.start_date === undefined || input.end_date === undefined) {
          throw new Error(
            "rule_type DATE_BETWEEN requires both start_date and end_date (YYYY-MM-DD).",
          );
        }
        condition = {
          type: "DATE_BETWEEN",
          values: [
            { userEnteredValue: input.start_date },
            { userEnteredValue: input.end_date },
          ],
        };
        break;
      }
    }

    const sheetId = await resolveSheetId(
      ctx.fetch,
      spreadsheetId,
      input.worksheet,
    );
    const range = a1ToGridRange(sheetId, input.range);

    const rule: Record<string, unknown> = { condition, strict };
    if (showCustomUi !== undefined) rule.showCustomUi = showCustomUi;

    await googleSheetsFetch(
      ctx.fetch,
      `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      {
        method: "POST",
        body: JSON.stringify({
          requests: [{ setDataValidation: { range, rule } }],
        }),
      },
    );

    return { validated_range: input.range };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
