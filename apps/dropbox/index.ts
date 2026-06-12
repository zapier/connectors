import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import addFolderMemberDefinition from "./scripts/addFolderMember.ts";
import appendToTextFileDefinition from "./scripts/appendToTextFile.ts";
import copyFileDefinition from "./scripts/copyFile.ts";
import createFileRequestDefinition from "./scripts/createFileRequest.ts";
import createFolderDefinition from "./scripts/createFolder.ts";
import createSharedLinkDefinition from "./scripts/createSharedLink.ts";
import createTextFileDefinition from "./scripts/createTextFile.ts";
import deletePathDefinition from "./scripts/deletePath.ts";
import getCurrentAccountDefinition from "./scripts/getCurrentAccount.ts";
import getFileContentsDefinition from "./scripts/getFileContents.ts";
import getFileMetadataDefinition from "./scripts/getFileMetadata.ts";
import getTemporaryLinkDefinition from "./scripts/getTemporaryLink.ts";
import listFileRequestsDefinition from "./scripts/listFileRequests.ts";
import listFolderDefinition from "./scripts/listFolder.ts";
import listSharedFoldersDefinition from "./scripts/listSharedFolders.ts";
import listSharedLinksDefinition from "./scripts/listSharedLinks.ts";
import modifySharedLinkSettingsDefinition from "./scripts/modifySharedLinkSettings.ts";
import moveFileDefinition from "./scripts/moveFile.ts";
import removeFolderMemberDefinition from "./scripts/removeFolderMember.ts";
import searchFilesDefinition from "./scripts/searchFiles.ts";
import uploadFileDefinition from "./scripts/uploadFile.ts";

const connector = defineConnector({
  scripts: {
    addFolderMember: addFolderMemberDefinition,
    appendToTextFile: appendToTextFileDefinition,
    copyFile: copyFileDefinition,
    createFileRequest: createFileRequestDefinition,
    createFolder: createFolderDefinition,
    createSharedLink: createSharedLinkDefinition,
    createTextFile: createTextFileDefinition,
    deletePath: deletePathDefinition,
    getCurrentAccount: getCurrentAccountDefinition,
    getFileContents: getFileContentsDefinition,
    getFileMetadata: getFileMetadataDefinition,
    getTemporaryLink: getTemporaryLinkDefinition,
    listFileRequests: listFileRequestsDefinition,
    listFolder: listFolderDefinition,
    listSharedFolders: listSharedFoldersDefinition,
    listSharedLinks: listSharedLinksDefinition,
    modifySharedLinkSettings: modifySharedLinkSettingsDefinition,
    moveFile: moveFileDefinition,
    removeFolderMember: removeFolderMemberDefinition,
    searchFiles: searchFilesDefinition,
    uploadFile: uploadFileDefinition,
  },
  connectionResolvers,
});

export default connector;
export const {
  addFolderMember,
  appendToTextFile,
  copyFile,
  createFileRequest,
  createFolder,
  createSharedLink,
  createTextFile,
  deletePath,
  getCurrentAccount,
  getFileContents,
  getFileMetadata,
  getTemporaryLink,
  listFileRequests,
  listFolder,
  listSharedFolders,
  listSharedLinks,
  modifySharedLinkSettings,
  moveFile,
  removeFolderMember,
  searchFiles,
  uploadFile,
} = toFunctions(connector);
