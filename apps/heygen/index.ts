import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import cloneVoiceDefinition from "./scripts/cloneVoice.ts";
import createAvatarDefinition from "./scripts/createAvatar.ts";
import createCinematicVideoDefinition from "./scripts/createCinematicVideo.ts";
import createLipsyncDefinition from "./scripts/createLipsync.ts";
import createVideoDefinition from "./scripts/createVideo.ts";
import createVideoAgentVideoDefinition from "./scripts/createVideoAgentVideo.ts";
import deleteVideoDefinition from "./scripts/deleteVideo.ts";
import designVoiceDefinition from "./scripts/designVoice.ts";
import generateSpeechDefinition from "./scripts/generateSpeech.ts";
import getAvatarGroupDefinition from "./scripts/getAvatarGroup.ts";
import getAvatarLookDefinition from "./scripts/getAvatarLook.ts";
import getCurrentUserDefinition from "./scripts/getCurrentUser.ts";
import getLipsyncDefinition from "./scripts/getLipsync.ts";
import getVideoDefinition from "./scripts/getVideo.ts";
import getVideoAgentSessionDefinition from "./scripts/getVideoAgentSession.ts";
import getVideoTranslationDefinition from "./scripts/getVideoTranslation.ts";
import getVoiceDefinition from "./scripts/getVoice.ts";
import listAvatarGroupsDefinition from "./scripts/listAvatarGroups.ts";
import listAvatarLooksDefinition from "./scripts/listAvatarLooks.ts";
import listLipsyncsDefinition from "./scripts/listLipsyncs.ts";
import listTranslationLanguagesDefinition from "./scripts/listTranslationLanguages.ts";
import listVideoAgentSessionsDefinition from "./scripts/listVideoAgentSessions.ts";
import listVideosDefinition from "./scripts/listVideos.ts";
import listVideoTranslationsDefinition from "./scripts/listVideoTranslations.ts";
import listVoicesDefinition from "./scripts/listVoices.ts";
import sendVideoAgentMessageDefinition from "./scripts/sendVideoAgentMessage.ts";
import translateVideoDefinition from "./scripts/translateVideo.ts";
import updateAvatarLookDefinition from "./scripts/updateAvatarLook.ts";

const connector = defineConnector({
  scripts: {
    cloneVoice: cloneVoiceDefinition,
    createAvatar: createAvatarDefinition,
    createCinematicVideo: createCinematicVideoDefinition,
    createLipsync: createLipsyncDefinition,
    createVideo: createVideoDefinition,
    createVideoAgentVideo: createVideoAgentVideoDefinition,
    deleteVideo: deleteVideoDefinition,
    designVoice: designVoiceDefinition,
    generateSpeech: generateSpeechDefinition,
    getAvatarGroup: getAvatarGroupDefinition,
    getAvatarLook: getAvatarLookDefinition,
    getCurrentUser: getCurrentUserDefinition,
    getLipsync: getLipsyncDefinition,
    getVideo: getVideoDefinition,
    getVideoAgentSession: getVideoAgentSessionDefinition,
    getVideoTranslation: getVideoTranslationDefinition,
    getVoice: getVoiceDefinition,
    listAvatarGroups: listAvatarGroupsDefinition,
    listAvatarLooks: listAvatarLooksDefinition,
    listLipsyncs: listLipsyncsDefinition,
    listTranslationLanguages: listTranslationLanguagesDefinition,
    listVideoAgentSessions: listVideoAgentSessionsDefinition,
    listVideos: listVideosDefinition,
    listVideoTranslations: listVideoTranslationsDefinition,
    listVoices: listVoicesDefinition,
    sendVideoAgentMessage: sendVideoAgentMessageDefinition,
    translateVideo: translateVideoDefinition,
    updateAvatarLook: updateAvatarLookDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  cloneVoice,
  createAvatar,
  createCinematicVideo,
  createLipsync,
  createVideo,
  createVideoAgentVideo,
  deleteVideo,
  designVoice,
  generateSpeech,
  getAvatarGroup,
  getAvatarLook,
  getCurrentUser,
  getLipsync,
  getVideo,
  getVideoAgentSession,
  getVideoTranslation,
  getVoice,
  listAvatarGroups,
  listAvatarLooks,
  listLipsyncs,
  listTranslationLanguages,
  listVideoAgentSessions,
  listVideos,
  listVideoTranslations,
  listVoices,
  sendVideoAgentMessage,
  translateVideo,
  updateAvatarLook,
} = toFunctions(connector);
