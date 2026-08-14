import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import copyItemDefinition from "./scripts/copyItem.ts";
import createFolderDefinition from "./scripts/createFolder.ts";
import createSharingLinkDefinition from "./scripts/createSharingLink.ts";
import deleteItemDefinition from "./scripts/deleteItem.ts";
import exportFileDefinition from "./scripts/exportFile.ts";
import findFilesDefinition from "./scripts/findFiles.ts";
import findItemsByKqlDefinition from "./scripts/findItemsByKql.ts";
import getCopyStatusDefinition from "./scripts/getCopyStatus.ts";
import getDriveDefinition from "./scripts/getDrive.ts";
import getItemDefinition from "./scripts/getItem.ts";
import getItemByShareUrlDefinition from "./scripts/getItemByShareUrl.ts";
import inviteToItemDefinition from "./scripts/inviteToItem.ts";
import listDrivesDefinition from "./scripts/listDrives.ts";
import listFolderItemsDefinition from "./scripts/listFolderItems.ts";
import listItemPermissionsDefinition from "./scripts/listItemPermissions.ts";
import moveItemDefinition from "./scripts/moveItem.ts";
import removeItemPermissionDefinition from "./scripts/removeItemPermission.ts";
import replaceFileDefinition from "./scripts/replaceFile.ts";
import uploadFileDefinition from "./scripts/uploadFile.ts";
import uploadTextFileDefinition from "./scripts/uploadTextFile.ts";

const connector = defineConnector({
  scripts: {
    copyItem: copyItemDefinition,
    createFolder: createFolderDefinition,
    createSharingLink: createSharingLinkDefinition,
    deleteItem: deleteItemDefinition,
    exportFile: exportFileDefinition,
    findFiles: findFilesDefinition,
    findItemsByKql: findItemsByKqlDefinition,
    getCopyStatus: getCopyStatusDefinition,
    getDrive: getDriveDefinition,
    getItem: getItemDefinition,
    getItemByShareUrl: getItemByShareUrlDefinition,
    inviteToItem: inviteToItemDefinition,
    listDrives: listDrivesDefinition,
    listFolderItems: listFolderItemsDefinition,
    listItemPermissions: listItemPermissionsDefinition,
    moveItem: moveItemDefinition,
    removeItemPermission: removeItemPermissionDefinition,
    replaceFile: replaceFileDefinition,
    uploadFile: uploadFileDefinition,
    uploadTextFile: uploadTextFileDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  copyItem,
  createFolder,
  createSharingLink,
  deleteItem,
  exportFile,
  findFiles,
  findItemsByKql,
  getCopyStatus,
  getDrive,
  getItem,
  getItemByShareUrl,
  inviteToItem,
  listDrives,
  listFolderItems,
  listItemPermissions,
  moveItem,
  removeItemPermission,
  replaceFile,
  uploadFile,
  uploadTextFile,
} = toFunctions(connector);
