import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import copyItemDefinition from "./scripts/copyItem.ts";
import createFolderDefinition from "./scripts/createFolder.ts";
import createListDefinition from "./scripts/createList.ts";
import createListItemDefinition from "./scripts/createListItem.ts";
import createPageDefinition from "./scripts/createPage.ts";
import createSharingLinkDefinition from "./scripts/createSharingLink.ts";
import deleteItemDefinition from "./scripts/deleteItem.ts";
import deleteListItemDefinition from "./scripts/deleteListItem.ts";
import deletePageDefinition from "./scripts/deletePage.ts";
import exportFileDefinition from "./scripts/exportFile.ts";
import findFilesDefinition from "./scripts/findFiles.ts";
import findListItemsDefinition from "./scripts/findListItems.ts";
import findSitesDefinition from "./scripts/findSites.ts";
import getCopyStatusDefinition from "./scripts/getCopyStatus.ts";
import getItemDefinition from "./scripts/getItem.ts";
import getListItemDefinition from "./scripts/getListItem.ts";
import getPageDefinition from "./scripts/getPage.ts";
import getSiteDefinition from "./scripts/getSite.ts";
import inviteToItemDefinition from "./scripts/inviteToItem.ts";
import listColumnsDefinition from "./scripts/listColumns.ts";
import listDrivesDefinition from "./scripts/listDrives.ts";
import listFolderItemsDefinition from "./scripts/listFolderItems.ts";
import listItemPermissionsDefinition from "./scripts/listItemPermissions.ts";
import listListsDefinition from "./scripts/listLists.ts";
import listPagesDefinition from "./scripts/listPages.ts";
import moveItemDefinition from "./scripts/moveItem.ts";
import publishPageDefinition from "./scripts/publishPage.ts";
import removeItemPermissionDefinition from "./scripts/removeItemPermission.ts";
import replaceFileDefinition from "./scripts/replaceFile.ts";
import updateListItemDefinition from "./scripts/updateListItem.ts";
import uploadFileDefinition from "./scripts/uploadFile.ts";
import uploadTextFileDefinition from "./scripts/uploadTextFile.ts";

const connector = defineConnector({
  scripts: {
    copyItem: copyItemDefinition,
    createFolder: createFolderDefinition,
    createList: createListDefinition,
    createListItem: createListItemDefinition,
    createPage: createPageDefinition,
    createSharingLink: createSharingLinkDefinition,
    deleteItem: deleteItemDefinition,
    deleteListItem: deleteListItemDefinition,
    deletePage: deletePageDefinition,
    exportFile: exportFileDefinition,
    findFiles: findFilesDefinition,
    findListItems: findListItemsDefinition,
    findSites: findSitesDefinition,
    getCopyStatus: getCopyStatusDefinition,
    getItem: getItemDefinition,
    getListItem: getListItemDefinition,
    getPage: getPageDefinition,
    getSite: getSiteDefinition,
    inviteToItem: inviteToItemDefinition,
    listColumns: listColumnsDefinition,
    listDrives: listDrivesDefinition,
    listFolderItems: listFolderItemsDefinition,
    listItemPermissions: listItemPermissionsDefinition,
    listLists: listListsDefinition,
    listPages: listPagesDefinition,
    moveItem: moveItemDefinition,
    publishPage: publishPageDefinition,
    removeItemPermission: removeItemPermissionDefinition,
    replaceFile: replaceFileDefinition,
    updateListItem: updateListItemDefinition,
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
  createList,
  createListItem,
  createPage,
  createSharingLink,
  deleteItem,
  deleteListItem,
  deletePage,
  exportFile,
  findFiles,
  findListItems,
  findSites,
  getCopyStatus,
  getItem,
  getListItem,
  getPage,
  getSite,
  inviteToItem,
  listColumns,
  listDrives,
  listFolderItems,
  listItemPermissions,
  listLists,
  listPages,
  moveItem,
  publishPage,
  removeItemPermission,
  replaceFile,
  updateListItem,
  uploadFile,
  uploadTextFile,
} = toFunctions(connector);
