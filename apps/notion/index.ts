import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./skills/notion/connections.ts";
import appendBlockChildrenDefinition from "./skills/notion/scripts/appendBlockChildren.ts";
import copyPageDefinition from "./skills/notion/scripts/copyPage.ts";
import createCommentDefinition from "./skills/notion/scripts/createComment.ts";
import createDatabaseDefinition from "./skills/notion/scripts/createDatabase.ts";
import createDataSourceDefinition from "./skills/notion/scripts/createDataSource.ts";
import createPageDefinition from "./skills/notion/scripts/createPage.ts";
import deleteBlockDefinition from "./skills/notion/scripts/deleteBlock.ts";
import getBlockDefinition from "./skills/notion/scripts/getBlock.ts";
import getBlockChildrenDefinition from "./skills/notion/scripts/getBlockChildren.ts";
import getBotUserDefinition from "./skills/notion/scripts/getBotUser.ts";
import getDatabaseDefinition from "./skills/notion/scripts/getDatabase.ts";
import getDataSourceDefinition from "./skills/notion/scripts/getDataSource.ts";
import getPageDefinition from "./skills/notion/scripts/getPage.ts";
import getPageAsMarkdownDefinition from "./skills/notion/scripts/getPageAsMarkdown.ts";
import getPagePropertyDefinition from "./skills/notion/scripts/getPageProperty.ts";
import getUserDefinition from "./skills/notion/scripts/getUser.ts";
import listCommentsDefinition from "./skills/notion/scripts/listComments.ts";
import listUsersDefinition from "./skills/notion/scripts/listUsers.ts";
import queryDataSourceDefinition from "./skills/notion/scripts/queryDataSource.ts";
import searchDefinition from "./skills/notion/scripts/search.ts";
import updateBlockDefinition from "./skills/notion/scripts/updateBlock.ts";
import updateDatabaseDefinition from "./skills/notion/scripts/updateDatabase.ts";
import updateDataSourceDefinition from "./skills/notion/scripts/updateDataSource.ts";
import updatePageDefinition from "./skills/notion/scripts/updatePage.ts";

const connector = defineConnector({
  scripts: {
    appendBlockChildren: appendBlockChildrenDefinition,
    copyPage: copyPageDefinition,
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
  meta: import.meta,
});

export default connector;
export const {
  appendBlockChildren,
  copyPage,
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
