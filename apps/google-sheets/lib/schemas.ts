// Shared Zod pieces for the header-keyed record tools (createRow/createRows/
// updateRow/updateRows/lookupRow/findRows/listRows). Lifted here because the same
// cell-value and record shapes recur across 4+ tools and would otherwise drift.

import { z } from "zod";

/** A single cell value an agent can write. USER_ENTERED parses strings into numbers/dates/formulas. */
export const cellValueSchema = z.union([z.string(), z.number(), z.boolean()]);

/** A row as an object keyed by column-header label, e.g. { "Date": "2026-06-18", "Amount": 42.5 }. */
export const recordInputSchema = z.record(z.string(), cellValueSchema);

/** A row read back as header-keyed strings (FORMATTED_VALUE reads return display strings). */
export const recordOutputSchema = z.record(z.string(), z.string());
