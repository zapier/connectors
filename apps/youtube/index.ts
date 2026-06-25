import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import addVideoToPlaylistDefinition from "./scripts/addVideoToPlaylist.ts";
import createPlaylistDefinition from "./scripts/createPlaylist.ts";
import deletePlaylistDefinition from "./scripts/deletePlaylist.ts";
import deleteVideoDefinition from "./scripts/deleteVideo.ts";
import downloadCaptionDefinition from "./scripts/downloadCaption.ts";
import getChannelDefinition from "./scripts/getChannel.ts";
import getVideoDefinition from "./scripts/getVideo.ts";
import listCaptionsDefinition from "./scripts/listCaptions.ts";
import listCommentsDefinition from "./scripts/listComments.ts";
import listPlaylistItemsDefinition from "./scripts/listPlaylistItems.ts";
import listPlaylistsDefinition from "./scripts/listPlaylists.ts";
import listSubscriptionsDefinition from "./scripts/listSubscriptions.ts";
import listVideoCategoriesDefinition from "./scripts/listVideoCategories.ts";
import postCommentDefinition from "./scripts/postComment.ts";
import rateVideoDefinition from "./scripts/rateVideo.ts";
import removeVideoFromPlaylistDefinition from "./scripts/removeVideoFromPlaylist.ts";
import replyToCommentDefinition from "./scripts/replyToComment.ts";
import searchVideosDefinition from "./scripts/searchVideos.ts";
import subscribeToChannelDefinition from "./scripts/subscribeToChannel.ts";
import unsubscribeFromChannelDefinition from "./scripts/unsubscribeFromChannel.ts";
import updatePlaylistDefinition from "./scripts/updatePlaylist.ts";
import updateVideoDefinition from "./scripts/updateVideo.ts";

const connector = defineConnector({
  scripts: {
    addVideoToPlaylist: addVideoToPlaylistDefinition,
    createPlaylist: createPlaylistDefinition,
    deletePlaylist: deletePlaylistDefinition,
    deleteVideo: deleteVideoDefinition,
    downloadCaption: downloadCaptionDefinition,
    getChannel: getChannelDefinition,
    getVideo: getVideoDefinition,
    listCaptions: listCaptionsDefinition,
    listComments: listCommentsDefinition,
    listPlaylistItems: listPlaylistItemsDefinition,
    listPlaylists: listPlaylistsDefinition,
    listSubscriptions: listSubscriptionsDefinition,
    listVideoCategories: listVideoCategoriesDefinition,
    postComment: postCommentDefinition,
    rateVideo: rateVideoDefinition,
    removeVideoFromPlaylist: removeVideoFromPlaylistDefinition,
    replyToComment: replyToCommentDefinition,
    searchVideos: searchVideosDefinition,
    subscribeToChannel: subscribeToChannelDefinition,
    unsubscribeFromChannel: unsubscribeFromChannelDefinition,
    updatePlaylist: updatePlaylistDefinition,
    updateVideo: updateVideoDefinition,
  },
  connectionResolvers,
});

export default connector;
export const {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  deleteVideo,
  downloadCaption,
  getChannel,
  getVideo,
  listCaptions,
  listComments,
  listPlaylistItems,
  listPlaylists,
  listSubscriptions,
  listVideoCategories,
  postComment,
  rateVideo,
  removeVideoFromPlaylist,
  replyToComment,
  searchVideos,
  subscribeToChannel,
  unsubscribeFromChannel,
  updatePlaylist,
  updateVideo,
} = toFunctions(connector);
