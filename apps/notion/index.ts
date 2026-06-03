import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import copyPageDefinition from "./scripts/copyPage.ts";
import createDatabaseItemDefinition from "./scripts/createDatabaseItem.ts";
import searchDefinition from "./scripts/search.ts";

const connector = defineConnector({
  scripts: {
    search: searchDefinition,
    createDatabaseItem: createDatabaseItemDefinition,
    copyPage: copyPageDefinition,
  },
  connectionResolvers,
});

export default connector;
export const { search, createDatabaseItem, copyPage } = toFunctions(connector);
