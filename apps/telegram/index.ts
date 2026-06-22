import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import copyMessageDefinition from "./scripts/copyMessage.ts";
import deleteMessageDefinition from "./scripts/deleteMessage.ts";
import editMessageTextDefinition from "./scripts/editMessageText.ts";
import forwardMessageDefinition from "./scripts/forwardMessage.ts";
import getChatDefinition from "./scripts/getChat.ts";
import getChatAdministratorsDefinition from "./scripts/getChatAdministrators.ts";
import getChatMemberDefinition from "./scripts/getChatMember.ts";
import getChatMemberCountDefinition from "./scripts/getChatMemberCount.ts";
import getFileDefinition from "./scripts/getFile.ts";
import getMeDefinition from "./scripts/getMe.ts";
import listRecentChatsDefinition from "./scripts/listRecentChats.ts";
import pinChatMessageDefinition from "./scripts/pinChatMessage.ts";
import sendAudioDefinition from "./scripts/sendAudio.ts";
import sendContactDefinition from "./scripts/sendContact.ts";
import sendDocumentDefinition from "./scripts/sendDocument.ts";
import sendLocationDefinition from "./scripts/sendLocation.ts";
import sendMessageDefinition from "./scripts/sendMessage.ts";
import sendPhotoDefinition from "./scripts/sendPhoto.ts";
import sendPollDefinition from "./scripts/sendPoll.ts";
import sendVideoDefinition from "./scripts/sendVideo.ts";
import unpinChatMessageDefinition from "./scripts/unpinChatMessage.ts";

const connector = defineConnector({
  scripts: {
    copyMessage: copyMessageDefinition,
    deleteMessage: deleteMessageDefinition,
    editMessageText: editMessageTextDefinition,
    forwardMessage: forwardMessageDefinition,
    getChat: getChatDefinition,
    getChatAdministrators: getChatAdministratorsDefinition,
    getChatMember: getChatMemberDefinition,
    getChatMemberCount: getChatMemberCountDefinition,
    getFile: getFileDefinition,
    getMe: getMeDefinition,
    listRecentChats: listRecentChatsDefinition,
    pinChatMessage: pinChatMessageDefinition,
    sendAudio: sendAudioDefinition,
    sendContact: sendContactDefinition,
    sendDocument: sendDocumentDefinition,
    sendLocation: sendLocationDefinition,
    sendMessage: sendMessageDefinition,
    sendPhoto: sendPhotoDefinition,
    sendPoll: sendPollDefinition,
    sendVideo: sendVideoDefinition,
    unpinChatMessage: unpinChatMessageDefinition,
  },
  connectionResolvers,
});

export default connector;
export const {
  copyMessage,
  deleteMessage,
  editMessageText,
  forwardMessage,
  getChat,
  getChatAdministrators,
  getChatMember,
  getChatMemberCount,
  getFile,
  getMe,
  listRecentChats,
  pinChatMessage,
  sendAudio,
  sendContact,
  sendDocument,
  sendLocation,
  sendMessage,
  sendPhoto,
  sendPoll,
  sendVideo,
  unpinChatMessage,
} = toFunctions(connector);
