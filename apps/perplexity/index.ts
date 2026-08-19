import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import createAgentDefinition from "./scripts/createAgent.ts";
import getAgentResponseDefinition from "./scripts/getAgentResponse.ts";
import listModelsDefinition from "./scripts/listModels.ts";
import searchDefinition from "./scripts/search.ts";

const connector = defineConnector({
  scripts: {
    createAgent: createAgentDefinition,
    getAgentResponse: getAgentResponseDefinition,
    listModels: listModelsDefinition,
    search: searchDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const { createAgent, getAgentResponse, listModels, search } =
  toFunctions(connector);
