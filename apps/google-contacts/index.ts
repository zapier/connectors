import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import copyOtherContactDefinition from "./scripts/copyOtherContact.ts";
import createContactDefinition from "./scripts/createContact.ts";
import createContactGroupDefinition from "./scripts/createContactGroup.ts";
import deleteContactDefinition from "./scripts/deleteContact.ts";
import deleteContactGroupDefinition from "./scripts/deleteContactGroup.ts";
import deleteContactPhotoDefinition from "./scripts/deleteContactPhoto.ts";
import getContactDefinition from "./scripts/getContact.ts";
import getContactGroupDefinition from "./scripts/getContactGroup.ts";
import listContactGroupsDefinition from "./scripts/listContactGroups.ts";
import listContactsDefinition from "./scripts/listContacts.ts";
import listOtherContactsDefinition from "./scripts/listOtherContacts.ts";
import modifyContactGroupMembersDefinition from "./scripts/modifyContactGroupMembers.ts";
import searchContactsDefinition from "./scripts/searchContacts.ts";
import searchOtherContactsDefinition from "./scripts/searchOtherContacts.ts";
import updateContactDefinition from "./scripts/updateContact.ts";
import updateContactGroupDefinition from "./scripts/updateContactGroup.ts";
import updateContactPhotoDefinition from "./scripts/updateContactPhoto.ts";

const connector = defineConnector({
  scripts: {
    copyOtherContact: copyOtherContactDefinition,
    createContact: createContactDefinition,
    createContactGroup: createContactGroupDefinition,
    deleteContact: deleteContactDefinition,
    deleteContactGroup: deleteContactGroupDefinition,
    deleteContactPhoto: deleteContactPhotoDefinition,
    getContact: getContactDefinition,
    getContactGroup: getContactGroupDefinition,
    listContactGroups: listContactGroupsDefinition,
    listContacts: listContactsDefinition,
    listOtherContacts: listOtherContactsDefinition,
    modifyContactGroupMembers: modifyContactGroupMembersDefinition,
    searchContacts: searchContactsDefinition,
    searchOtherContacts: searchOtherContactsDefinition,
    updateContact: updateContactDefinition,
    updateContactGroup: updateContactGroupDefinition,
    updateContactPhoto: updateContactPhotoDefinition,
  },
  connectionResolvers,
});

export default connector;
export const {
  copyOtherContact,
  createContact,
  createContactGroup,
  deleteContact,
  deleteContactGroup,
  deleteContactPhoto,
  getContact,
  getContactGroup,
  listContactGroups,
  listContacts,
  listOtherContacts,
  modifyContactGroupMembers,
  searchContacts,
  searchOtherContacts,
  updateContact,
  updateContactGroup,
  updateContactPhoto,
} = toFunctions(connector);
