import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import addContactToSegmentDefinition from "./scripts/addContactToSegment.ts";
import createBroadcastDefinition from "./scripts/createBroadcast.ts";
import createContactDefinition from "./scripts/createContact.ts";
import createSegmentDefinition from "./scripts/createSegment.ts";
import deleteContactDefinition from "./scripts/deleteContact.ts";
import deleteSegmentDefinition from "./scripts/deleteSegment.ts";
import getContactDefinition from "./scripts/getContact.ts";
import getEmailDefinition from "./scripts/getEmail.ts";
import getSegmentDefinition from "./scripts/getSegment.ts";
import listContactPropertiesDefinition from "./scripts/listContactProperties.ts";
import listContactsDefinition from "./scripts/listContacts.ts";
import listContactSegmentsDefinition from "./scripts/listContactSegments.ts";
import listDomainsDefinition from "./scripts/listDomains.ts";
import listEmailsDefinition from "./scripts/listEmails.ts";
import listSegmentContactsDefinition from "./scripts/listSegmentContacts.ts";
import listSegmentsDefinition from "./scripts/listSegments.ts";
import removeContactFromSegmentDefinition from "./scripts/removeContactFromSegment.ts";
import sendBroadcastDefinition from "./scripts/sendBroadcast.ts";
import sendEmailDefinition from "./scripts/sendEmail.ts";
import sendEventDefinition from "./scripts/sendEvent.ts";
import updateContactDefinition from "./scripts/updateContact.ts";

const connector = defineConnector({
  scripts: {
    addContactToSegment: addContactToSegmentDefinition,
    createBroadcast: createBroadcastDefinition,
    createContact: createContactDefinition,
    createSegment: createSegmentDefinition,
    deleteContact: deleteContactDefinition,
    deleteSegment: deleteSegmentDefinition,
    getContact: getContactDefinition,
    getEmail: getEmailDefinition,
    getSegment: getSegmentDefinition,
    listContactProperties: listContactPropertiesDefinition,
    listContacts: listContactsDefinition,
    listContactSegments: listContactSegmentsDefinition,
    listDomains: listDomainsDefinition,
    listEmails: listEmailsDefinition,
    listSegmentContacts: listSegmentContactsDefinition,
    listSegments: listSegmentsDefinition,
    removeContactFromSegment: removeContactFromSegmentDefinition,
    sendBroadcast: sendBroadcastDefinition,
    sendEmail: sendEmailDefinition,
    sendEvent: sendEventDefinition,
    updateContact: updateContactDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  addContactToSegment,
  createBroadcast,
  createContact,
  createSegment,
  deleteContact,
  deleteSegment,
  getContact,
  getEmail,
  getSegment,
  listContactProperties,
  listContacts,
  listContactSegments,
  listDomains,
  listEmails,
  listSegmentContacts,
  listSegments,
  removeContactFromSegment,
  sendBroadcast,
  sendEmail,
  sendEvent,
  updateContact,
} = toFunctions(connector);
