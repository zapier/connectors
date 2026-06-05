import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import copyPageDefinition from "./scripts/copyPage.ts";
import createDatabaseItemDefinition from "./scripts/createDatabaseItem.ts";
import searchDefinition from "./scripts/search.ts";

const connector = defineConnector({
  scripts: {
    copyPage: copyPageDefinition,
    createDatabaseItem: createDatabaseItemDefinition,
    search: searchDefinition,
  },
  connectionResolvers,
});

export default connector;
export const { copyPage, createDatabaseItem, search } = toFunctions(connector);
