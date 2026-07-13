import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import addSharedVoiceDefinition from "./scripts/addSharedVoice.ts";
import createSoundEffectDefinition from "./scripts/createSoundEffect.ts";
import createVoiceFromDesignDefinition from "./scripts/createVoiceFromDesign.ts";
import deleteHistoryItemDefinition from "./scripts/deleteHistoryItem.ts";
import deleteVoiceDefinition from "./scripts/deleteVoice.ts";
import designVoiceDefinition from "./scripts/designVoice.ts";
import downloadHistoryAudioDefinition from "./scripts/downloadHistoryAudio.ts";
import getHistoryItemDefinition from "./scripts/getHistoryItem.ts";
import getUserSubscriptionDefinition from "./scripts/getUserSubscription.ts";
import getVoiceDefinition from "./scripts/getVoice.ts";
import isolateAudioDefinition from "./scripts/isolateAudio.ts";
import listHistoryDefinition from "./scripts/listHistory.ts";
import listModelsDefinition from "./scripts/listModels.ts";
import listVoicesDefinition from "./scripts/listVoices.ts";
import searchVoiceLibraryDefinition from "./scripts/searchVoiceLibrary.ts";
import speechToSpeechDefinition from "./scripts/speechToSpeech.ts";
import speechToTextDefinition from "./scripts/speechToText.ts";
import textToDialogueDefinition from "./scripts/textToDialogue.ts";
import textToSpeechDefinition from "./scripts/textToSpeech.ts";

const connector = defineConnector({
  scripts: {
    addSharedVoice: addSharedVoiceDefinition,
    createSoundEffect: createSoundEffectDefinition,
    createVoiceFromDesign: createVoiceFromDesignDefinition,
    deleteHistoryItem: deleteHistoryItemDefinition,
    deleteVoice: deleteVoiceDefinition,
    designVoice: designVoiceDefinition,
    downloadHistoryAudio: downloadHistoryAudioDefinition,
    getHistoryItem: getHistoryItemDefinition,
    getUserSubscription: getUserSubscriptionDefinition,
    getVoice: getVoiceDefinition,
    isolateAudio: isolateAudioDefinition,
    listHistory: listHistoryDefinition,
    listModels: listModelsDefinition,
    listVoices: listVoicesDefinition,
    searchVoiceLibrary: searchVoiceLibraryDefinition,
    speechToSpeech: speechToSpeechDefinition,
    speechToText: speechToTextDefinition,
    textToDialogue: textToDialogueDefinition,
    textToSpeech: textToSpeechDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  addSharedVoice,
  createSoundEffect,
  createVoiceFromDesign,
  deleteHistoryItem,
  deleteVoice,
  designVoice,
  downloadHistoryAudio,
  getHistoryItem,
  getUserSubscription,
  getVoice,
  isolateAudio,
  listHistory,
  listModels,
  listVoices,
  searchVoiceLibrary,
  speechToSpeech,
  speechToText,
  textToDialogue,
  textToSpeech,
} = toFunctions(connector);
