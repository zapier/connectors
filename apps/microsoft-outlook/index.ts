import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import copyMessageDefinition from "./scripts/copyMessage.ts";
import createContactDefinition from "./scripts/createContact.ts";
import createDraftDefinition from "./scripts/createDraft.ts";
import createEventDefinition from "./scripts/createEvent.ts";
import createMailFolderDefinition from "./scripts/createMailFolder.ts";
import createReplyDraftDefinition from "./scripts/createReplyDraft.ts";
import deleteContactDefinition from "./scripts/deleteContact.ts";
import deleteEventDefinition from "./scripts/deleteEvent.ts";
import deleteMessageDefinition from "./scripts/deleteMessage.ts";
import forwardMessageDefinition from "./scripts/forwardMessage.ts";
import getAttachmentDefinition from "./scripts/getAttachment.ts";
import getContactDefinition from "./scripts/getContact.ts";
import getEventDefinition from "./scripts/getEvent.ts";
import getMeDefinition from "./scripts/getMe.ts";
import getMessageDefinition from "./scripts/getMessage.ts";
import listAttachmentsDefinition from "./scripts/listAttachments.ts";
import listCalendarsDefinition from "./scripts/listCalendars.ts";
import listCalendarViewDefinition from "./scripts/listCalendarView.ts";
import listCategoriesDefinition from "./scripts/listCategories.ts";
import listContactsDefinition from "./scripts/listContacts.ts";
import listEventsDefinition from "./scripts/listEvents.ts";
import listMailFoldersDefinition from "./scripts/listMailFolders.ts";
import listMessagesDefinition from "./scripts/listMessages.ts";
import moveMessageDefinition from "./scripts/moveMessage.ts";
import replyToMessageDefinition from "./scripts/replyToMessage.ts";
import sendDraftDefinition from "./scripts/sendDraft.ts";
import sendMailDefinition from "./scripts/sendMail.ts";
import updateContactDefinition from "./scripts/updateContact.ts";
import updateEventDefinition from "./scripts/updateEvent.ts";
import updateMessageDefinition from "./scripts/updateMessage.ts";

const connector = defineConnector({
  scripts: {
    copyMessage: copyMessageDefinition,
    createContact: createContactDefinition,
    createDraft: createDraftDefinition,
    createEvent: createEventDefinition,
    createMailFolder: createMailFolderDefinition,
    createReplyDraft: createReplyDraftDefinition,
    deleteContact: deleteContactDefinition,
    deleteEvent: deleteEventDefinition,
    deleteMessage: deleteMessageDefinition,
    forwardMessage: forwardMessageDefinition,
    getAttachment: getAttachmentDefinition,
    getContact: getContactDefinition,
    getEvent: getEventDefinition,
    getMe: getMeDefinition,
    getMessage: getMessageDefinition,
    listAttachments: listAttachmentsDefinition,
    listCalendars: listCalendarsDefinition,
    listCalendarView: listCalendarViewDefinition,
    listCategories: listCategoriesDefinition,
    listContacts: listContactsDefinition,
    listEvents: listEventsDefinition,
    listMailFolders: listMailFoldersDefinition,
    listMessages: listMessagesDefinition,
    moveMessage: moveMessageDefinition,
    replyToMessage: replyToMessageDefinition,
    sendDraft: sendDraftDefinition,
    sendMail: sendMailDefinition,
    updateContact: updateContactDefinition,
    updateEvent: updateEventDefinition,
    updateMessage: updateMessageDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  copyMessage,
  createContact,
  createDraft,
  createEvent,
  createMailFolder,
  createReplyDraft,
  deleteContact,
  deleteEvent,
  deleteMessage,
  forwardMessage,
  getAttachment,
  getContact,
  getEvent,
  getMe,
  getMessage,
  listAttachments,
  listCalendars,
  listCalendarView,
  listCategories,
  listContacts,
  listEvents,
  listMailFolders,
  listMessages,
  moveMessage,
  replyToMessage,
  sendDraft,
  sendMail,
  updateContact,
  updateEvent,
  updateMessage,
} = toFunctions(connector);
