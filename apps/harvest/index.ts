import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import createClientDefinition from "./scripts/createClient.ts";
import createContactDefinition from "./scripts/createContact.ts";
import createProjectDefinition from "./scripts/createProject.ts";
import createProjectTaskAssignmentDefinition from "./scripts/createProjectTaskAssignment.ts";
import createTaskDefinition from "./scripts/createTask.ts";
import createTimeEntryDefinition from "./scripts/createTimeEntry.ts";
import createTimeEntryForTimestampsDefinition from "./scripts/createTimeEntryForTimestamps.ts";
import deleteContactDefinition from "./scripts/deleteContact.ts";
import deleteTimeEntryDefinition from "./scripts/deleteTimeEntry.ts";
import getClientDefinition from "./scripts/getClient.ts";
import getCompanyDefinition from "./scripts/getCompany.ts";
import getCurrentUserDefinition from "./scripts/getCurrentUser.ts";
import getInvoiceDefinition from "./scripts/getInvoice.ts";
import getProjectDefinition from "./scripts/getProject.ts";
import getTimeEntryDefinition from "./scripts/getTimeEntry.ts";
import listClientsDefinition from "./scripts/listClients.ts";
import listContactsDefinition from "./scripts/listContacts.ts";
import listInvoicesDefinition from "./scripts/listInvoices.ts";
import listProjectsDefinition from "./scripts/listProjects.ts";
import listProjectTaskAssignmentsDefinition from "./scripts/listProjectTaskAssignments.ts";
import listTasksDefinition from "./scripts/listTasks.ts";
import listTimeEntriesDefinition from "./scripts/listTimeEntries.ts";
import listUsersDefinition from "./scripts/listUsers.ts";
import restartTimerDefinition from "./scripts/restartTimer.ts";
import stopTimerDefinition from "./scripts/stopTimer.ts";
import updateClientDefinition from "./scripts/updateClient.ts";
import updateContactDefinition from "./scripts/updateContact.ts";
import updateProjectDefinition from "./scripts/updateProject.ts";
import updateTimeEntryDefinition from "./scripts/updateTimeEntry.ts";

const connector = defineConnector({
  scripts: {
    createClient: createClientDefinition,
    createContact: createContactDefinition,
    createProject: createProjectDefinition,
    createProjectTaskAssignment: createProjectTaskAssignmentDefinition,
    createTask: createTaskDefinition,
    createTimeEntry: createTimeEntryDefinition,
    createTimeEntryForTimestamps: createTimeEntryForTimestampsDefinition,
    deleteContact: deleteContactDefinition,
    deleteTimeEntry: deleteTimeEntryDefinition,
    getClient: getClientDefinition,
    getCompany: getCompanyDefinition,
    getCurrentUser: getCurrentUserDefinition,
    getInvoice: getInvoiceDefinition,
    getProject: getProjectDefinition,
    getTimeEntry: getTimeEntryDefinition,
    listClients: listClientsDefinition,
    listContacts: listContactsDefinition,
    listInvoices: listInvoicesDefinition,
    listProjects: listProjectsDefinition,
    listProjectTaskAssignments: listProjectTaskAssignmentsDefinition,
    listTasks: listTasksDefinition,
    listTimeEntries: listTimeEntriesDefinition,
    listUsers: listUsersDefinition,
    restartTimer: restartTimerDefinition,
    stopTimer: stopTimerDefinition,
    updateClient: updateClientDefinition,
    updateContact: updateContactDefinition,
    updateProject: updateProjectDefinition,
    updateTimeEntry: updateTimeEntryDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  createClient,
  createContact,
  createProject,
  createProjectTaskAssignment,
  createTask,
  createTimeEntry,
  createTimeEntryForTimestamps,
  deleteContact,
  deleteTimeEntry,
  getClient,
  getCompany,
  getCurrentUser,
  getInvoice,
  getProject,
  getTimeEntry,
  listClients,
  listContacts,
  listInvoices,
  listProjects,
  listProjectTaskAssignments,
  listTasks,
  listTimeEntries,
  listUsers,
  restartTimer,
  stopTimer,
  updateClient,
  updateContact,
  updateProject,
  updateTimeEntry,
} = toFunctions(connector);
