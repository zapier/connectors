import { defineConnector, toFunctions } from "@zapier/connectors-sdk";
import searchScript from "./scripts/search.ts";
import createDatabaseItemScript from "./scripts/create-database-item.ts";
import copyPageScript from "./scripts/copy-page.ts";

const connector = defineConnector({
  search: searchScript,
  createDatabaseItem: createDatabaseItemScript,
  copyPage: copyPageScript,
});

export default connector;
export const { search, createDatabaseItem, copyPage } = toFunctions(connector);
