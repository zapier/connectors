import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import createCampaignBudgetDefinition from "./scripts/createCampaignBudget.ts";
import createConversionActionDefinition from "./scripts/createConversionAction.ts";
import getReportDefinition from "./scripts/getReport.ts";
import listAccessibleCustomersDefinition from "./scripts/listAccessibleCustomers.ts";
import listAdGroupsDefinition from "./scripts/listAdGroups.ts";
import listAdsDefinition from "./scripts/listAds.ts";
import listCampaignsDefinition from "./scripts/listCampaigns.ts";
import listConversionActionsDefinition from "./scripts/listConversionActions.ts";
import listCustomerClientsDefinition from "./scripts/listCustomerClients.ts";
import listSearchableFieldsDefinition from "./scripts/listSearchableFields.ts";
import searchDefinition from "./scripts/search.ts";
import setCampaignStatusDefinition from "./scripts/setCampaignStatus.ts";
import updateCampaignBudgetDefinition from "./scripts/updateCampaignBudget.ts";

const connector = defineConnector({
  scripts: {
    createCampaignBudget: createCampaignBudgetDefinition,
    createConversionAction: createConversionActionDefinition,
    getReport: getReportDefinition,
    listAccessibleCustomers: listAccessibleCustomersDefinition,
    listAdGroups: listAdGroupsDefinition,
    listAds: listAdsDefinition,
    listCampaigns: listCampaignsDefinition,
    listConversionActions: listConversionActionsDefinition,
    listCustomerClients: listCustomerClientsDefinition,
    listSearchableFields: listSearchableFieldsDefinition,
    search: searchDefinition,
    setCampaignStatus: setCampaignStatusDefinition,
    updateCampaignBudget: updateCampaignBudgetDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  createCampaignBudget,
  createConversionAction,
  getReport,
  listAccessibleCustomers,
  listAdGroups,
  listAds,
  listCampaigns,
  listConversionActions,
  listCustomerClients,
  listSearchableFields,
  search,
  setCampaignStatus,
  updateCampaignBudget,
} = toFunctions(connector);
