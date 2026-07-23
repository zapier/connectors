import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import addColumnDefinition from "./scripts/addColumn.ts";
import addConditionalFormatRuleDefinition from "./scripts/addConditionalFormatRule.ts";
import addWorksheetDefinition from "./scripts/addWorksheet.ts";
import clearRowsDefinition from "./scripts/clearRows.ts";
import clearValuesDefinition from "./scripts/clearValues.ts";
import copyRangeDefinition from "./scripts/copyRange.ts";
import copyWorksheetDefinition from "./scripts/copyWorksheet.ts";
import createRowDefinition from "./scripts/createRow.ts";
import createRowsDefinition from "./scripts/createRows.ts";
import createSpreadsheetDefinition from "./scripts/createSpreadsheet.ts";
import deleteRowsDefinition from "./scripts/deleteRows.ts";
import deleteWorksheetDefinition from "./scripts/deleteWorksheet.ts";
import findRowsDefinition from "./scripts/findRows.ts";
import formatCellsDefinition from "./scripts/formatCells.ts";
import getSpreadsheetDefinition from "./scripts/getSpreadsheet.ts";
import getValuesDefinition from "./scripts/getValues.ts";
import listRowsDefinition from "./scripts/listRows.ts";
import listSpreadsheetsDefinition from "./scripts/listSpreadsheets.ts";
import listWorksheetsDefinition from "./scripts/listWorksheets.ts";
import lookupRowDefinition from "./scripts/lookupRow.ts";
import setDataValidationDefinition from "./scripts/setDataValidation.ts";
import sortRangeDefinition from "./scripts/sortRange.ts";
import updateRowDefinition from "./scripts/updateRow.ts";
import updateRowsDefinition from "./scripts/updateRows.ts";
import updateValuesDefinition from "./scripts/updateValues.ts";
import updateWorksheetPropertiesDefinition from "./scripts/updateWorksheetProperties.ts";

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
