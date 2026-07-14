import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import animateCharacterDefinition from "./scripts/animateCharacter.ts";
import cancelTaskDefinition from "./scripts/cancelTask.ts";
import convertVoiceDefinition from "./scripts/convertVoice.ts";
import dubAudioDefinition from "./scripts/dubAudio.ts";
import editVideoDefinition from "./scripts/editVideo.ts";
import generateCampaignImagesDefinition from "./scripts/generateCampaignImages.ts";
import generateImageDefinition from "./scripts/generateImage.ts";
import generateMarketingImageDefinition from "./scripts/generateMarketingImage.ts";
import generateMultiShotVideoDefinition from "./scripts/generateMultiShotVideo.ts";
import generateProductAdDefinition from "./scripts/generateProductAd.ts";
import generateProductUgcDefinition from "./scripts/generateProductUgc.ts";
import generateSoundEffectDefinition from "./scripts/generateSoundEffect.ts";
import generateSpeechDefinition from "./scripts/generateSpeech.ts";
import generateVideoFromImageDefinition from "./scripts/generateVideoFromImage.ts";
import generateVideoFromTextDefinition from "./scripts/generateVideoFromText.ts";
import getCreditUsageDefinition from "./scripts/getCreditUsage.ts";
import getOrganizationDefinition from "./scripts/getOrganization.ts";
import getTaskDefinition from "./scripts/getTask.ts";
import isolateVoiceDefinition from "./scripts/isolateVoice.ts";
import localizeAdDefinition from "./scripts/localizeAd.ts";
import swapProductDefinition from "./scripts/swapProduct.ts";
import upscaleImageDefinition from "./scripts/upscaleImage.ts";
import upscaleVideoDefinition from "./scripts/upscaleVideo.ts";

const connector = defineConnector({
  scripts: {
    animateCharacter: animateCharacterDefinition,
    cancelTask: cancelTaskDefinition,
    convertVoice: convertVoiceDefinition,
    dubAudio: dubAudioDefinition,
    editVideo: editVideoDefinition,
    generateCampaignImages: generateCampaignImagesDefinition,
    generateImage: generateImageDefinition,
    generateMarketingImage: generateMarketingImageDefinition,
    generateMultiShotVideo: generateMultiShotVideoDefinition,
    generateProductAd: generateProductAdDefinition,
    generateProductUgc: generateProductUgcDefinition,
    generateSoundEffect: generateSoundEffectDefinition,
    generateSpeech: generateSpeechDefinition,
    generateVideoFromImage: generateVideoFromImageDefinition,
    generateVideoFromText: generateVideoFromTextDefinition,
    getCreditUsage: getCreditUsageDefinition,
    getOrganization: getOrganizationDefinition,
    getTask: getTaskDefinition,
    isolateVoice: isolateVoiceDefinition,
    localizeAd: localizeAdDefinition,
    swapProduct: swapProductDefinition,
    upscaleImage: upscaleImageDefinition,
    upscaleVideo: upscaleVideoDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  animateCharacter,
  cancelTask,
  convertVoice,
  dubAudio,
  editVideo,
  generateCampaignImages,
  generateImage,
  generateMarketingImage,
  generateMultiShotVideo,
  generateProductAd,
  generateProductUgc,
  generateSoundEffect,
  generateSpeech,
  generateVideoFromImage,
  generateVideoFromText,
  getCreditUsage,
  getOrganization,
  getTask,
  isolateVoice,
  localizeAd,
  swapProduct,
  upscaleImage,
  upscaleVideo,
} = toFunctions(connector);
