import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import addOrUpdateObjectDefinition from "./scripts/addOrUpdateObject.ts";
import batchDefinition from "./scripts/batch.ts";
import browseObjectsDefinition from "./scripts/browseObjects.ts";
import clearObjectsDefinition from "./scripts/clearObjects.ts";
import clearSynonymsDefinition from "./scripts/clearSynonyms.ts";
import copyOrMoveIndexDefinition from "./scripts/copyOrMoveIndex.ts";
import deleteByDefinition from "./scripts/deleteBy.ts";
import deleteIndexDefinition from "./scripts/deleteIndex.ts";
import deleteObjectDefinition from "./scripts/deleteObject.ts";
import deleteRuleDefinition from "./scripts/deleteRule.ts";
import deleteSynonymDefinition from "./scripts/deleteSynonym.ts";
import getObjectDefinition from "./scripts/getObject.ts";
import getObjectsDefinition from "./scripts/getObjects.ts";
import getRecommendationsDefinition from "./scripts/getRecommendations.ts";
import getRecommendRuleDefinition from "./scripts/getRecommendRule.ts";
import getRuleDefinition from "./scripts/getRule.ts";
import getSettingsDefinition from "./scripts/getSettings.ts";
import getSynonymDefinition from "./scripts/getSynonym.ts";
import getTaskDefinition from "./scripts/getTask.ts";
import listIndicesDefinition from "./scripts/listIndices.ts";
import multipleBatchDefinition from "./scripts/multipleBatch.ts";
import partialUpdateObjectDefinition from "./scripts/partialUpdateObject.ts";
import saveObjectDefinition from "./scripts/saveObject.ts";
import saveRuleDefinition from "./scripts/saveRule.ts";
import saveSynonymDefinition from "./scripts/saveSynonym.ts";
import searchForFacetValuesDefinition from "./scripts/searchForFacetValues.ts";
import searchIndexDefinition from "./scripts/searchIndex.ts";
import searchMultipleIndicesDefinition from "./scripts/searchMultipleIndices.ts";
import searchRecommendRulesDefinition from "./scripts/searchRecommendRules.ts";
import searchRulesDefinition from "./scripts/searchRules.ts";
import searchSynonymsDefinition from "./scripts/searchSynonyms.ts";
import setSettingsDefinition from "./scripts/setSettings.ts";

const connector = defineConnector({
  scripts: {
    addOrUpdateObject: addOrUpdateObjectDefinition,
    batch: batchDefinition,
    browseObjects: browseObjectsDefinition,
    clearObjects: clearObjectsDefinition,
    clearSynonyms: clearSynonymsDefinition,
    copyOrMoveIndex: copyOrMoveIndexDefinition,
    deleteBy: deleteByDefinition,
    deleteIndex: deleteIndexDefinition,
    deleteObject: deleteObjectDefinition,
    deleteRule: deleteRuleDefinition,
    deleteSynonym: deleteSynonymDefinition,
    getObject: getObjectDefinition,
    getObjects: getObjectsDefinition,
    getRecommendations: getRecommendationsDefinition,
    getRecommendRule: getRecommendRuleDefinition,
    getRule: getRuleDefinition,
    getSettings: getSettingsDefinition,
    getSynonym: getSynonymDefinition,
    getTask: getTaskDefinition,
    listIndices: listIndicesDefinition,
    multipleBatch: multipleBatchDefinition,
    partialUpdateObject: partialUpdateObjectDefinition,
    saveObject: saveObjectDefinition,
    saveRule: saveRuleDefinition,
    saveSynonym: saveSynonymDefinition,
    searchForFacetValues: searchForFacetValuesDefinition,
    searchIndex: searchIndexDefinition,
    searchMultipleIndices: searchMultipleIndicesDefinition,
    searchRecommendRules: searchRecommendRulesDefinition,
    searchRules: searchRulesDefinition,
    searchSynonyms: searchSynonymsDefinition,
    setSettings: setSettingsDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  addOrUpdateObject,
  batch,
  browseObjects,
  clearObjects,
  clearSynonyms,
  copyOrMoveIndex,
  deleteBy,
  deleteIndex,
  deleteObject,
  deleteRule,
  deleteSynonym,
  getObject,
  getObjects,
  getRecommendations,
  getRecommendRule,
  getRule,
  getSettings,
  getSynonym,
  getTask,
  listIndices,
  multipleBatch,
  partialUpdateObject,
  saveObject,
  saveRule,
  saveSynonym,
  searchForFacetValues,
  searchIndex,
  searchMultipleIndices,
  searchRecommendRules,
  searchRules,
  searchSynonyms,
  setSettings,
} = toFunctions(connector);
