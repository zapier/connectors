import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import addIssueCommentDefinition from "./scripts/addIssueComment.ts";
import addMergeRequestCommentDefinition from "./scripts/addMergeRequestComment.ts";
import addMergeRequestDiffCommentDefinition from "./scripts/addMergeRequestDiffComment.ts";
import approveMergeRequestDefinition from "./scripts/approveMergeRequest.ts";
import cancelPipelineDefinition from "./scripts/cancelPipeline.ts";
import commitFilesDefinition from "./scripts/commitFiles.ts";
import compareRefsDefinition from "./scripts/compareRefs.ts";
import createBranchDefinition from "./scripts/createBranch.ts";
import createIssueDefinition from "./scripts/createIssue.ts";
import createMergeRequestDefinition from "./scripts/createMergeRequest.ts";
import createWorkItemDefinition from "./scripts/createWorkItem.ts";
import findUsersDefinition from "./scripts/findUsers.ts";
import getCurrentUserDefinition from "./scripts/getCurrentUser.ts";
import getFileDefinition from "./scripts/getFile.ts";
import getIssueDefinition from "./scripts/getIssue.ts";
import getJobLogDefinition from "./scripts/getJobLog.ts";
import getMergeRequestDefinition from "./scripts/getMergeRequest.ts";
import getMergeRequestDiffsDefinition from "./scripts/getMergeRequestDiffs.ts";
import getPipelineDefinition from "./scripts/getPipeline.ts";
import getProjectDefinition from "./scripts/getProject.ts";
import getWorkItemDefinition from "./scripts/getWorkItem.ts";
import listBranchesDefinition from "./scripts/listBranches.ts";
import listCommitsDefinition from "./scripts/listCommits.ts";
import listGroupMergeRequestsDefinition from "./scripts/listGroupMergeRequests.ts";
import listIssuesDefinition from "./scripts/listIssues.ts";
import listLabelsDefinition from "./scripts/listLabels.ts";
import listMergeRequestCommitsDefinition from "./scripts/listMergeRequestCommits.ts";
import listMergeRequestDiscussionsDefinition from "./scripts/listMergeRequestDiscussions.ts";
import listMergeRequestNotesDefinition from "./scripts/listMergeRequestNotes.ts";
import listMergeRequestsDefinition from "./scripts/listMergeRequests.ts";
import listMilestonesDefinition from "./scripts/listMilestones.ts";
import listPipelineJobsDefinition from "./scripts/listPipelineJobs.ts";
import listPipelinesDefinition from "./scripts/listPipelines.ts";
import listProjectMergeRequestsDefinition from "./scripts/listProjectMergeRequests.ts";
import listProjectsDefinition from "./scripts/listProjects.ts";
import listRepositoryTreeDefinition from "./scripts/listRepositoryTree.ts";
import listWorkItemsDefinition from "./scripts/listWorkItems.ts";
import mergeMergeRequestDefinition from "./scripts/mergeMergeRequest.ts";
import playJobDefinition from "./scripts/playJob.ts";
import retryPipelineDefinition from "./scripts/retryPipeline.ts";
import searchDefinition from "./scripts/search.ts";
import searchGroupDefinition from "./scripts/searchGroup.ts";
import searchProjectDefinition from "./scripts/searchProject.ts";
import triggerPipelineDefinition from "./scripts/triggerPipeline.ts";
import updateIssueDefinition from "./scripts/updateIssue.ts";
import updateMergeRequestDefinition from "./scripts/updateMergeRequest.ts";
import updateWorkItemDefinition from "./scripts/updateWorkItem.ts";

const connector = defineConnector({
  scripts: {
    addIssueComment: addIssueCommentDefinition,
    addMergeRequestComment: addMergeRequestCommentDefinition,
    addMergeRequestDiffComment: addMergeRequestDiffCommentDefinition,
    approveMergeRequest: approveMergeRequestDefinition,
    cancelPipeline: cancelPipelineDefinition,
    commitFiles: commitFilesDefinition,
    compareRefs: compareRefsDefinition,
    createBranch: createBranchDefinition,
    createIssue: createIssueDefinition,
    createMergeRequest: createMergeRequestDefinition,
    createWorkItem: createWorkItemDefinition,
    findUsers: findUsersDefinition,
    getCurrentUser: getCurrentUserDefinition,
    getFile: getFileDefinition,
    getIssue: getIssueDefinition,
    getJobLog: getJobLogDefinition,
    getMergeRequest: getMergeRequestDefinition,
    getMergeRequestDiffs: getMergeRequestDiffsDefinition,
    getPipeline: getPipelineDefinition,
    getProject: getProjectDefinition,
    getWorkItem: getWorkItemDefinition,
    listBranches: listBranchesDefinition,
    listCommits: listCommitsDefinition,
    listGroupMergeRequests: listGroupMergeRequestsDefinition,
    listIssues: listIssuesDefinition,
    listLabels: listLabelsDefinition,
    listMergeRequestCommits: listMergeRequestCommitsDefinition,
    listMergeRequestDiscussions: listMergeRequestDiscussionsDefinition,
    listMergeRequestNotes: listMergeRequestNotesDefinition,
    listMergeRequests: listMergeRequestsDefinition,
    listMilestones: listMilestonesDefinition,
    listPipelineJobs: listPipelineJobsDefinition,
    listPipelines: listPipelinesDefinition,
    listProjectMergeRequests: listProjectMergeRequestsDefinition,
    listProjects: listProjectsDefinition,
    listRepositoryTree: listRepositoryTreeDefinition,
    listWorkItems: listWorkItemsDefinition,
    mergeMergeRequest: mergeMergeRequestDefinition,
    playJob: playJobDefinition,
    retryPipeline: retryPipelineDefinition,
    search: searchDefinition,
    searchGroup: searchGroupDefinition,
    searchProject: searchProjectDefinition,
    triggerPipeline: triggerPipelineDefinition,
    updateIssue: updateIssueDefinition,
    updateMergeRequest: updateMergeRequestDefinition,
    updateWorkItem: updateWorkItemDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  addIssueComment,
  addMergeRequestComment,
  addMergeRequestDiffComment,
  approveMergeRequest,
  cancelPipeline,
  commitFiles,
  compareRefs,
  createBranch,
  createIssue,
  createMergeRequest,
  createWorkItem,
  findUsers,
  getCurrentUser,
  getFile,
  getIssue,
  getJobLog,
  getMergeRequest,
  getMergeRequestDiffs,
  getPipeline,
  getProject,
  getWorkItem,
  listBranches,
  listCommits,
  listGroupMergeRequests,
  listIssues,
  listLabels,
  listMergeRequestCommits,
  listMergeRequestDiscussions,
  listMergeRequestNotes,
  listMergeRequests,
  listMilestones,
  listPipelineJobs,
  listPipelines,
  listProjectMergeRequests,
  listProjects,
  listRepositoryTree,
  listWorkItems,
  mergeMergeRequest,
  playJob,
  retryPipeline,
  search,
  searchGroup,
  searchProject,
  triggerPipeline,
  updateIssue,
  updateMergeRequest,
  updateWorkItem,
} = toFunctions(connector);
