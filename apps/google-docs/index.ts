import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import appendTextDefinition from "./scripts/appendText.ts";
import createDocumentDefinition from "./scripts/createDocument.ts";
import createDocumentFromTemplateDefinition from "./scripts/createDocumentFromTemplate.ts";
import createFooterDefinition from "./scripts/createFooter.ts";
import createFootnoteDefinition from "./scripts/createFootnote.ts";
import createHeaderDefinition from "./scripts/createHeader.ts";
import createListDefinition from "./scripts/createList.ts";
import deleteContentRangeDefinition from "./scripts/deleteContentRange.ts";
import exportDocumentDefinition from "./scripts/exportDocument.ts";
import findDocumentsDefinition from "./scripts/findDocuments.ts";
import findTextDefinition from "./scripts/findText.ts";
import formatParagraphDefinition from "./scripts/formatParagraph.ts";
import formatTextDefinition from "./scripts/formatText.ts";
import getDocumentDefinition from "./scripts/getDocument.ts";
import insertImageDefinition from "./scripts/insertImage.ts";
import insertTableDefinition from "./scripts/insertTable.ts";
import insertTextDefinition from "./scripts/insertText.ts";
import modifyTableDefinition from "./scripts/modifyTable.ts";
import removeListFormattingDefinition from "./scripts/removeListFormatting.ts";
import replaceAllTextDefinition from "./scripts/replaceAllText.ts";
import replaceImageDefinition from "./scripts/replaceImage.ts";
import updateDocumentStyleDefinition from "./scripts/updateDocumentStyle.ts";

const connector = defineConnector({
  scripts: {
    appendText: appendTextDefinition,
    createDocument: createDocumentDefinition,
    createDocumentFromTemplate: createDocumentFromTemplateDefinition,
    createFooter: createFooterDefinition,
    createFootnote: createFootnoteDefinition,
    createHeader: createHeaderDefinition,
    createList: createListDefinition,
    deleteContentRange: deleteContentRangeDefinition,
    exportDocument: exportDocumentDefinition,
    findDocuments: findDocumentsDefinition,
    findText: findTextDefinition,
    formatParagraph: formatParagraphDefinition,
    formatText: formatTextDefinition,
    getDocument: getDocumentDefinition,
    insertImage: insertImageDefinition,
    insertTable: insertTableDefinition,
    insertText: insertTextDefinition,
    modifyTable: modifyTableDefinition,
    removeListFormatting: removeListFormattingDefinition,
    replaceAllText: replaceAllTextDefinition,
    replaceImage: replaceImageDefinition,
    updateDocumentStyle: updateDocumentStyleDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  appendText,
  createDocument,
  createDocumentFromTemplate,
  createFooter,
  createFootnote,
  createHeader,
  createList,
  deleteContentRange,
  exportDocument,
  findDocuments,
  findText,
  formatParagraph,
  formatText,
  getDocument,
  insertImage,
  insertTable,
  insertText,
  modifyTable,
  removeListFormatting,
  replaceAllText,
  replaceImage,
  updateDocumentStyle,
} = toFunctions(connector);
