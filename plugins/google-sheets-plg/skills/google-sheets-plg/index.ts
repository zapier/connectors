import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./skills/google-sheets-plg/connections.ts";
import addColumnDefinition from "./skills/google-sheets-plg/scripts/addColumn.ts";
import addConditionalFormatRuleDefinition from "./skills/google-sheets-plg/scripts/addConditionalFormatRule.ts";
import addWorksheetDefinition from "./skills/google-sheets-plg/scripts/addWorksheet.ts";
import clearRowsDefinition from "./skills/google-sheets-plg/scripts/clearRows.ts";
import clearValuesDefinition from "./skills/google-sheets-plg/scripts/clearValues.ts";
import copyRangeDefinition from "./skills/google-sheets-plg/scripts/copyRange.ts";
import copyWorksheetDefinition from "./skills/google-sheets-plg/scripts/copyWorksheet.ts";
import createRowDefinition from "./skills/google-sheets-plg/scripts/createRow.ts";
import createRowsDefinition from "./skills/google-sheets-plg/scripts/createRows.ts";
import createSpreadsheetDefinition from "./skills/google-sheets-plg/scripts/createSpreadsheet.ts";
import deleteRowsDefinition from "./skills/google-sheets-plg/scripts/deleteRows.ts";
import deleteWorksheetDefinition from "./skills/google-sheets-plg/scripts/deleteWorksheet.ts";
import findRowsDefinition from "./skills/google-sheets-plg/scripts/findRows.ts";
import formatCellsDefinition from "./skills/google-sheets-plg/scripts/formatCells.ts";
import getSpreadsheetDefinition from "./skills/google-sheets-plg/scripts/getSpreadsheet.ts";
import getValuesDefinition from "./skills/google-sheets-plg/scripts/getValues.ts";
import listRowsDefinition from "./skills/google-sheets-plg/scripts/listRows.ts";
import listSpreadsheetsDefinition from "./skills/google-sheets-plg/scripts/listSpreadsheets.ts";
import listWorksheetsDefinition from "./skills/google-sheets-plg/scripts/listWorksheets.ts";
import lookupRowDefinition from "./skills/google-sheets-plg/scripts/lookupRow.ts";
import setDataValidationDefinition from "./skills/google-sheets-plg/scripts/setDataValidation.ts";
import sortRangeDefinition from "./skills/google-sheets-plg/scripts/sortRange.ts";
import updateRowDefinition from "./skills/google-sheets-plg/scripts/updateRow.ts";
import updateRowsDefinition from "./skills/google-sheets-plg/scripts/updateRows.ts";
import updateValuesDefinition from "./skills/google-sheets-plg/scripts/updateValues.ts";
import updateWorksheetPropertiesDefinition from "./skills/google-sheets-plg/scripts/updateWorksheetProperties.ts";

const connector = defineConnector({
  scripts: {
    addColumn: addColumnDefinition,
    addConditionalFormatRule: addConditionalFormatRuleDefinition,
    addWorksheet: addWorksheetDefinition,
    clearRows: clearRowsDefinition,
    clearValues: clearValuesDefinition,
    copyRange: copyRangeDefinition,
    copyWorksheet: copyWorksheetDefinition,
    createRow: createRowDefinition,
    createRows: createRowsDefinition,
    createSpreadsheet: createSpreadsheetDefinition,
    deleteRows: deleteRowsDefinition,
    deleteWorksheet: deleteWorksheetDefinition,
    findRows: findRowsDefinition,
    formatCells: formatCellsDefinition,
    getSpreadsheet: getSpreadsheetDefinition,
    getValues: getValuesDefinition,
    listRows: listRowsDefinition,
    listSpreadsheets: listSpreadsheetsDefinition,
    listWorksheets: listWorksheetsDefinition,
    lookupRow: lookupRowDefinition,
    setDataValidation: setDataValidationDefinition,
    sortRange: sortRangeDefinition,
    updateRow: updateRowDefinition,
    updateRows: updateRowsDefinition,
    updateValues: updateValuesDefinition,
    updateWorksheetProperties: updateWorksheetPropertiesDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  addColumn,
  addConditionalFormatRule,
  addWorksheet,
  clearRows,
  clearValues,
  copyRange,
  copyWorksheet,
  createRow,
  createRows,
  createSpreadsheet,
  deleteRows,
  deleteWorksheet,
  findRows,
  formatCells,
  getSpreadsheet,
  getValues,
  listRows,
  listSpreadsheets,
  listWorksheets,
  lookupRow,
  setDataValidation,
  sortRange,
  updateRow,
  updateRows,
  updateValues,
  updateWorksheetProperties,
} = toFunctions(connector);
