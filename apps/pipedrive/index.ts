import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import addDealProductDefinition from "./scripts/addDealProduct.ts";
import createActivityDefinition from "./scripts/createActivity.ts";
import createDealDefinition from "./scripts/createDeal.ts";
import createLeadDefinition from "./scripts/createLead.ts";
import createNoteDefinition from "./scripts/createNote.ts";
import createOrganizationDefinition from "./scripts/createOrganization.ts";
import createPersonDefinition from "./scripts/createPerson.ts";
import createProductDefinition from "./scripts/createProduct.ts";
import deleteActivityDefinition from "./scripts/deleteActivity.ts";
import deleteDealDefinition from "./scripts/deleteDeal.ts";
import deleteDealProductDefinition from "./scripts/deleteDealProduct.ts";
import getActivityDefinition from "./scripts/getActivity.ts";
import getDealDefinition from "./scripts/getDeal.ts";
import getLeadDefinition from "./scripts/getLead.ts";
import getNoteDefinition from "./scripts/getNote.ts";
import getOrganizationDefinition from "./scripts/getOrganization.ts";
import getPersonDefinition from "./scripts/getPerson.ts";
import getProductDefinition from "./scripts/getProduct.ts";
import getUserDefinition from "./scripts/getUser.ts";
import listActivitiesDefinition from "./scripts/listActivities.ts";
import listActivityTypesDefinition from "./scripts/listActivityTypes.ts";
import listCurrenciesDefinition from "./scripts/listCurrencies.ts";
import listDealFieldsDefinition from "./scripts/listDealFields.ts";
import listDealParticipantsDefinition from "./scripts/listDealParticipants.ts";
import listDealProductsDefinition from "./scripts/listDealProducts.ts";
import listDealsDefinition from "./scripts/listDeals.ts";
import listLeadsDefinition from "./scripts/listLeads.ts";
import listNotesDefinition from "./scripts/listNotes.ts";
import listOrganizationFieldsDefinition from "./scripts/listOrganizationFields.ts";
import listOrganizationsDefinition from "./scripts/listOrganizations.ts";
import listPersonFieldsDefinition from "./scripts/listPersonFields.ts";
import listPersonsDefinition from "./scripts/listPersons.ts";
import listPipelinesDefinition from "./scripts/listPipelines.ts";
import listProductFieldsDefinition from "./scripts/listProductFields.ts";
import listProductsDefinition from "./scripts/listProducts.ts";
import listStagesDefinition from "./scripts/listStages.ts";
import listUsersDefinition from "./scripts/listUsers.ts";
import searchDealsDefinition from "./scripts/searchDeals.ts";
import searchLeadsDefinition from "./scripts/searchLeads.ts";
import searchOrganizationsDefinition from "./scripts/searchOrganizations.ts";
import searchPersonsDefinition from "./scripts/searchPersons.ts";
import searchProductsDefinition from "./scripts/searchProducts.ts";
import updateActivityDefinition from "./scripts/updateActivity.ts";
import updateDealDefinition from "./scripts/updateDeal.ts";
import updateDealProductDefinition from "./scripts/updateDealProduct.ts";
import updateLeadDefinition from "./scripts/updateLead.ts";
import updateNoteDefinition from "./scripts/updateNote.ts";
import updateOrganizationDefinition from "./scripts/updateOrganization.ts";
import updatePersonDefinition from "./scripts/updatePerson.ts";
import updateProductDefinition from "./scripts/updateProduct.ts";

const connector = defineConnector({
  scripts: {
    addDealProduct: addDealProductDefinition,
    createActivity: createActivityDefinition,
    createDeal: createDealDefinition,
    createLead: createLeadDefinition,
    createNote: createNoteDefinition,
    createOrganization: createOrganizationDefinition,
    createPerson: createPersonDefinition,
    createProduct: createProductDefinition,
    deleteActivity: deleteActivityDefinition,
    deleteDeal: deleteDealDefinition,
    deleteDealProduct: deleteDealProductDefinition,
    getActivity: getActivityDefinition,
    getDeal: getDealDefinition,
    getLead: getLeadDefinition,
    getNote: getNoteDefinition,
    getOrganization: getOrganizationDefinition,
    getPerson: getPersonDefinition,
    getProduct: getProductDefinition,
    getUser: getUserDefinition,
    listActivities: listActivitiesDefinition,
    listActivityTypes: listActivityTypesDefinition,
    listCurrencies: listCurrenciesDefinition,
    listDealFields: listDealFieldsDefinition,
    listDealParticipants: listDealParticipantsDefinition,
    listDealProducts: listDealProductsDefinition,
    listDeals: listDealsDefinition,
    listLeads: listLeadsDefinition,
    listNotes: listNotesDefinition,
    listOrganizationFields: listOrganizationFieldsDefinition,
    listOrganizations: listOrganizationsDefinition,
    listPersonFields: listPersonFieldsDefinition,
    listPersons: listPersonsDefinition,
    listPipelines: listPipelinesDefinition,
    listProductFields: listProductFieldsDefinition,
    listProducts: listProductsDefinition,
    listStages: listStagesDefinition,
    listUsers: listUsersDefinition,
    searchDeals: searchDealsDefinition,
    searchLeads: searchLeadsDefinition,
    searchOrganizations: searchOrganizationsDefinition,
    searchPersons: searchPersonsDefinition,
    searchProducts: searchProductsDefinition,
    updateActivity: updateActivityDefinition,
    updateDeal: updateDealDefinition,
    updateDealProduct: updateDealProductDefinition,
    updateLead: updateLeadDefinition,
    updateNote: updateNoteDefinition,
    updateOrganization: updateOrganizationDefinition,
    updatePerson: updatePersonDefinition,
    updateProduct: updateProductDefinition,
  },
  connectionResolvers,
});

export default connector;
export const {
  addDealProduct,
  createActivity,
  createDeal,
  createLead,
  createNote,
  createOrganization,
  createPerson,
  createProduct,
  deleteActivity,
  deleteDeal,
  deleteDealProduct,
  getActivity,
  getDeal,
  getLead,
  getNote,
  getOrganization,
  getPerson,
  getProduct,
  getUser,
  listActivities,
  listActivityTypes,
  listCurrencies,
  listDealFields,
  listDealParticipants,
  listDealProducts,
  listDeals,
  listLeads,
  listNotes,
  listOrganizationFields,
  listOrganizations,
  listPersonFields,
  listPersons,
  listPipelines,
  listProductFields,
  listProducts,
  listStages,
  listUsers,
  searchDeals,
  searchLeads,
  searchOrganizations,
  searchPersons,
  searchProducts,
  updateActivity,
  updateDeal,
  updateDealProduct,
  updateLead,
  updateNote,
  updateOrganization,
  updatePerson,
  updateProduct,
} = toFunctions(connector);
