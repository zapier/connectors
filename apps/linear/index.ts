import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import addIssueLabelDefinition from "./scripts/addIssueLabel.ts";
import archiveIssueDefinition from "./scripts/archiveIssue.ts";
import createAttachmentDefinition from "./scripts/createAttachment.ts";
import createCommentDefinition from "./scripts/createComment.ts";
import createIssueDefinition from "./scripts/createIssue.ts";
import createProjectDefinition from "./scripts/createProject.ts";
import createProjectUpdateDefinition from "./scripts/createProjectUpdate.ts";
import getIssueDefinition from "./scripts/getIssue.ts";
import getProjectDefinition from "./scripts/getProject.ts";
import getViewerDefinition from "./scripts/getViewer.ts";
import listCyclesDefinition from "./scripts/listCycles.ts";
import listIssueCommentsDefinition from "./scripts/listIssueComments.ts";
import listLabelsDefinition from "./scripts/listLabels.ts";
import listProjectMilestonesDefinition from "./scripts/listProjectMilestones.ts";
import listProjectsDefinition from "./scripts/listProjects.ts";
import listTeamsDefinition from "./scripts/listTeams.ts";
import listUsersDefinition from "./scripts/listUsers.ts";
import listWorkflowStatesDefinition from "./scripts/listWorkflowStates.ts";
import removeIssueLabelDefinition from "./scripts/removeIssueLabel.ts";
import searchIssuesDefinition from "./scripts/searchIssues.ts";
import updateIssueDefinition from "./scripts/updateIssue.ts";
import updateProjectDefinition from "./scripts/updateProject.ts";

const connector = defineConnector({
  scripts: {
    addIssueLabel: addIssueLabelDefinition,
    archiveIssue: archiveIssueDefinition,
    createAttachment: createAttachmentDefinition,
    createComment: createCommentDefinition,
    createIssue: createIssueDefinition,
    createProject: createProjectDefinition,
    createProjectUpdate: createProjectUpdateDefinition,
    getIssue: getIssueDefinition,
    getProject: getProjectDefinition,
    getViewer: getViewerDefinition,
    listCycles: listCyclesDefinition,
    listIssueComments: listIssueCommentsDefinition,
    listLabels: listLabelsDefinition,
    listProjectMilestones: listProjectMilestonesDefinition,
    listProjects: listProjectsDefinition,
    listTeams: listTeamsDefinition,
    listUsers: listUsersDefinition,
    listWorkflowStates: listWorkflowStatesDefinition,
    removeIssueLabel: removeIssueLabelDefinition,
    searchIssues: searchIssuesDefinition,
    updateIssue: updateIssueDefinition,
    updateProject: updateProjectDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  addIssueLabel,
  archiveIssue,
  createAttachment,
  createComment,
  createIssue,
  createProject,
  createProjectUpdate,
  getIssue,
  getProject,
  getViewer,
  listCycles,
  listIssueComments,
  listLabels,
  listProjectMilestones,
  listProjects,
  listTeams,
  listUsers,
  listWorkflowStates,
  removeIssueLabel,
  searchIssues,
  updateIssue,
  updateProject,
} = toFunctions(connector);
