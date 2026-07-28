import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import addMemberRoleDefinition from "./scripts/addMemberRole.ts";
import addReactionDefinition from "./scripts/addReaction.ts";
import createChannelDefinition from "./scripts/createChannel.ts";
import createRoleDefinition from "./scripts/createRole.ts";
import createThreadDefinition from "./scripts/createThread.ts";
import createWebhookDefinition from "./scripts/createWebhook.ts";
import deleteMessageDefinition from "./scripts/deleteMessage.ts";
import editMessageDefinition from "./scripts/editMessage.ts";
import executeWebhookDefinition from "./scripts/executeWebhook.ts";
import getChannelDefinition from "./scripts/getChannel.ts";
import getCurrentUserDefinition from "./scripts/getCurrentUser.ts";
import getGuildDefinition from "./scripts/getGuild.ts";
import getMemberDefinition from "./scripts/getMember.ts";
import getMessageDefinition from "./scripts/getMessage.ts";
import getUserDefinition from "./scripts/getUser.ts";
import listActiveThreadsDefinition from "./scripts/listActiveThreads.ts";
import listChannelMessagesDefinition from "./scripts/listChannelMessages.ts";
import listChannelsDefinition from "./scripts/listChannels.ts";
import listChannelWebhooksDefinition from "./scripts/listChannelWebhooks.ts";
import listEmojisDefinition from "./scripts/listEmojis.ts";
import listGuildsDefinition from "./scripts/listGuilds.ts";
import listMembersDefinition from "./scripts/listMembers.ts";
import listRolesDefinition from "./scripts/listRoles.ts";
import modifyChannelDefinition from "./scripts/modifyChannel.ts";
import removeMemberRoleDefinition from "./scripts/removeMemberRole.ts";
import removeReactionDefinition from "./scripts/removeReaction.ts";
import searchMembersDefinition from "./scripts/searchMembers.ts";
import sendChannelMessageDefinition from "./scripts/sendChannelMessage.ts";
import sendDirectMessageDefinition from "./scripts/sendDirectMessage.ts";

const connector = defineConnector({
  scripts: {
    addMemberRole: addMemberRoleDefinition,
    addReaction: addReactionDefinition,
    createChannel: createChannelDefinition,
    createRole: createRoleDefinition,
    createThread: createThreadDefinition,
    createWebhook: createWebhookDefinition,
    deleteMessage: deleteMessageDefinition,
    editMessage: editMessageDefinition,
    executeWebhook: executeWebhookDefinition,
    getChannel: getChannelDefinition,
    getCurrentUser: getCurrentUserDefinition,
    getGuild: getGuildDefinition,
    getMember: getMemberDefinition,
    getMessage: getMessageDefinition,
    getUser: getUserDefinition,
    listActiveThreads: listActiveThreadsDefinition,
    listChannelMessages: listChannelMessagesDefinition,
    listChannels: listChannelsDefinition,
    listChannelWebhooks: listChannelWebhooksDefinition,
    listEmojis: listEmojisDefinition,
    listGuilds: listGuildsDefinition,
    listMembers: listMembersDefinition,
    listRoles: listRolesDefinition,
    modifyChannel: modifyChannelDefinition,
    removeMemberRole: removeMemberRoleDefinition,
    removeReaction: removeReactionDefinition,
    searchMembers: searchMembersDefinition,
    sendChannelMessage: sendChannelMessageDefinition,
    sendDirectMessage: sendDirectMessageDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  addMemberRole,
  addReaction,
  createChannel,
  createRole,
  createThread,
  createWebhook,
  deleteMessage,
  editMessage,
  executeWebhook,
  getChannel,
  getCurrentUser,
  getGuild,
  getMember,
  getMessage,
  getUser,
  listActiveThreads,
  listChannelMessages,
  listChannels,
  listChannelWebhooks,
  listEmojis,
  listGuilds,
  listMembers,
  listRoles,
  modifyChannel,
  removeMemberRole,
  removeReaction,
  searchMembers,
  sendChannelMessage,
  sendDirectMessage,
} = toFunctions(connector);
