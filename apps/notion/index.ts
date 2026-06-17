import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import appendBlockChildrenDefinition from "./scripts/appendBlockChildren.ts";
import createCommentDefinition from "./scripts/createComment.ts";
import createDatabaseDefinition from "./scripts/createDatabase.ts";
import createDataSourceDefinition from "./scripts/createDataSource.ts";
import createPageDefinition from "./scripts/createPage.ts";
import deleteBlockDefinition from "./scripts/deleteBlock.ts";
import getBlockDefinition from "./scripts/getBlock.ts";
import getBlockChildrenDefinition from "./scripts/getBlockChildren.ts";
import getBotUserDefinition from "./scripts/getBotUser.ts";
import getDatabaseDefinition from "./scripts/getDatabase.ts";
import getDataSourceDefinition from "./scripts/getDataSource.ts";
import getPageDefinition from "./scripts/getPage.ts";
import getPageAsMarkdownDefinition from "./scripts/getPageAsMarkdown.ts";
import getPagePropertyDefinition from "./scripts/getPageProperty.ts";
import getUserDefinition from "./scripts/getUser.ts";
import listCommentsDefinition from "./scripts/listComments.ts";
import listUsersDefinition from "./scripts/listUsers.ts";
import queryDataSourceDefinition from "./scripts/queryDataSource.ts";
import searchDefinition from "./scripts/search.ts";
import updateBlockDefinition from "./scripts/updateBlock.ts";
import updateDatabaseDefinition from "./scripts/updateDatabase.ts";
import updateDataSourceDefinition from "./scripts/updateDataSource.ts";
import updatePageDefinition from "./scripts/updatePage.ts";

const connector = defineConnector({
  scripts: {
    appendBlockChildren: appendBlockChildrenDefinition,
    createComment: createCommentDefinition,
    createDatabase: createDatabaseDefinition,
    createDataSource: createDataSourceDefinition,
    createPage: createPageDefinition,
    deleteBlock: deleteBlockDefinition,
    getBlock: getBlockDefinition,
    getBlockChildren: getBlockChildrenDefinition,
    getBotUser: getBotUserDefinition,
    getDatabase: getDatabaseDefinition,
    getDataSource: getDataSourceDefinition,
    getPage: getPageDefinition,
    getPageAsMarkdown: getPageAsMarkdownDefinition,
    getPageProperty: getPagePropertyDefinition,
    getUser: getUserDefinition,
    listComments: listCommentsDefinition,
    listUsers: listUsersDefinition,
    queryDataSource: queryDataSourceDefinition,
    search: searchDefinition,
    updateBlock: updateBlockDefinition,
    updateDatabase: updateDatabaseDefinition,
    updateDataSource: updateDataSourceDefinition,
    updatePage: updatePageDefinition,
  },
  connectionResolvers,
});

export default connector;
export const {
  appendBlockChildren,
  createComment,
  createDatabase,
  createDataSource,
  createPage,
  deleteBlock,
  getBlock,
  getBlockChildren,
  getBotUser,
  getDatabase,
  getDataSource,
  getPage,
  getPageAsMarkdown,
  getPageProperty,
  getUser,
  listComments,
  listUsers,
  queryDataSource,
  search,
  updateBlock,
  updateDatabase,
  updateDataSource,
  updatePage,
} = toFunctions(connector);
