import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import appendTextDefinition from "./scripts/appendText.ts";
import createDocumentDefinition from "./scripts/createDocument.ts";
import createDocumentFromTemplateDefinition from "./scripts/createDocumentFromTemplate.ts";
import createListDefinition from "./scripts/createList.ts";
import deleteContentRangeDefinition from "./scripts/deleteContentRange.ts";
import exportDocumentDefinition from "./scripts/exportDocument.ts";
import findDocumentsDefinition from "./scripts/findDocuments.ts";
import findTextDefinition from "./scripts/findText.ts";
import formatParagraphDefinition from "./scripts/formatParagraph.ts";
import formatTextDefinition from "./scripts/formatText.ts";
import getDocumentDefinition from "./scripts/getDocument.ts";
import insertImageDefinition from "./scripts/insertImage.ts";
import insertTextDefinition from "./scripts/insertText.ts";
import removeListFormattingDefinition from "./scripts/removeListFormatting.ts";
import replaceAllTextDefinition from "./scripts/replaceAllText.ts";
import replaceImageDefinition from "./scripts/replaceImage.ts";
import updateDocumentStyleDefinition from "./scripts/updateDocumentStyle.ts";

const connector = defineConnector({
  scripts: {
    appendText: appendTextDefinition,
    createDocument: createDocumentDefinition,
    createDocumentFromTemplate: createDocumentFromTemplateDefinition,
    createList: createListDefinition,
    deleteContentRange: deleteContentRangeDefinition,
    exportDocument: exportDocumentDefinition,
    findDocuments: findDocumentsDefinition,
    findText: findTextDefinition,
    formatParagraph: formatParagraphDefinition,
    formatText: formatTextDefinition,
    getDocument: getDocumentDefinition,
    insertImage: insertImageDefinition,
    insertText: insertTextDefinition,
    removeListFormatting: removeListFormattingDefinition,
    replaceAllText: replaceAllTextDefinition,
    replaceImage: replaceImageDefinition,
    updateDocumentStyle: updateDocumentStyleDefinition,
  },
  connectionResolvers,
});

export default connector;
export const {
  appendText,
  createDocument,
  createDocumentFromTemplate,
  createList,
  deleteContentRange,
  exportDocument,
  findDocuments,
  findText,
  formatParagraph,
  formatText,
  getDocument,
  insertImage,
  insertText,
  removeListFormatting,
  replaceAllText,
  replaceImage,
  updateDocumentStyle,
} = toFunctions(connector);
