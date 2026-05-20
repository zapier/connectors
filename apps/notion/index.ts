import search from "./scripts/search.ts";
import createDatabaseItem from "./scripts/create-database-item.ts";
import copyPage from "./scripts/copy-page.ts";

export {
  buildExecuteOptionsFromEnv,
  toMcpTool,
  type AnyToolDefinition,
  type AuthExecuteOptions,
} from "@zapier/connectors-sdk";
export { search, createDatabaseItem, copyPage };

export default { search, createDatabaseItem, copyPage };
