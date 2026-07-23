import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import createRecordDefinition from "./scripts/createRecord.ts";
import findRecordDefinition from "./scripts/findRecord.ts";
import getCurrentUserDefinition from "./scripts/getCurrentUser.ts";
import getTableDefinition from "./scripts/getTable.ts";
import listRecordsDefinition from "./scripts/listRecords.ts";
import listTablesDefinition from "./scripts/listTables.ts";
import listWorkspacesDefinition from "./scripts/listWorkspaces.ts";
import listWorkspaceUsersDefinition from "./scripts/listWorkspaceUsers.ts";
import updateRecordDefinition from "./scripts/updateRecord.ts";

const connector = defineConnector({
  scripts: {
    createRecord: createRecordDefinition,
    findRecord: findRecordDefinition,
    getCurrentUser: getCurrentUserDefinition,
    getTable: getTableDefinition,
    listRecords: listRecordsDefinition,
    listTables: listTablesDefinition,
    listWorkspaces: listWorkspacesDefinition,
    listWorkspaceUsers: listWorkspaceUsersDefinition,
    updateRecord: updateRecordDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  createRecord,
  findRecord,
  getCurrentUser,
  getTable,
  listRecords,
  listTables,
  listWorkspaces,
  listWorkspaceUsers,
  updateRecord,
} = toFunctions(connector);
