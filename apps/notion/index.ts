import { buildExecuteOptionsFromEnv, toMcpTool } from "@zapier/connectors-sdk";
import search from "./scripts/search.ts";
import createDatabaseItem from "./scripts/create-database-item.ts";
import copyPage from "./scripts/copy-page.ts";

export { search, createDatabaseItem, copyPage };

export default {
  scripts: { search, createDatabaseItem, copyPage },
  toMcpTool,
  buildExecuteOptionsFromEnv,
};
