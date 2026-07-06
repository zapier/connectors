import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import addCardAttachmentDefinition from "./scripts/addCardAttachment.ts";
import addCardLabelDefinition from "./scripts/addCardLabel.ts";
import addCardMemberDefinition from "./scripts/addCardMember.ts";
import addChecklistItemDefinition from "./scripts/addChecklistItem.ts";
import addMemberToBoardDefinition from "./scripts/addMemberToBoard.ts";
import archiveCardDefinition from "./scripts/archiveCard.ts";
import closeBoardDefinition from "./scripts/closeBoard.ts";
import completeChecklistItemDefinition from "./scripts/completeChecklistItem.ts";
import copyBoardDefinition from "./scripts/copyBoard.ts";
import createBoardDefinition from "./scripts/createBoard.ts";
import createCardDefinition from "./scripts/createCard.ts";
import createChecklistDefinition from "./scripts/createChecklist.ts";
import createCommentDefinition from "./scripts/createComment.ts";
import createLabelDefinition from "./scripts/createLabel.ts";
import createListDefinition from "./scripts/createList.ts";
import deleteChecklistDefinition from "./scripts/deleteChecklist.ts";
import findBoardDefinition from "./scripts/findBoard.ts";
import findChecklistDefinition from "./scripts/findChecklist.ts";
import findChecklistItemDefinition from "./scripts/findChecklistItem.ts";
import findLabelDefinition from "./scripts/findLabel.ts";
import findListDefinition from "./scripts/findList.ts";
import findOrganizationMemberDefinition from "./scripts/findOrganizationMember.ts";
import getActionDefinition from "./scripts/getAction.ts";
import getBoardDefinition from "./scripts/getBoard.ts";
import getCardDefinition from "./scripts/getCard.ts";
import getChecklistDefinition from "./scripts/getChecklist.ts";
import getChecklistItemDefinition from "./scripts/getChecklistItem.ts";
import getCurrentMemberDefinition from "./scripts/getCurrentMember.ts";
import getLabelDefinition from "./scripts/getLabel.ts";
import getListDefinition from "./scripts/getList.ts";
import getMemberDefinition from "./scripts/getMember.ts";
import getOrganizationDefinition from "./scripts/getOrganization.ts";
import listBoardMembersDefinition from "./scripts/listBoardMembers.ts";
import listBoardsDefinition from "./scripts/listBoards.ts";
import listCardAttachmentsDefinition from "./scripts/listCardAttachments.ts";
import listCardsDefinition from "./scripts/listCards.ts";
import listCustomFieldsDefinition from "./scripts/listCustomFields.ts";
import listLabelsDefinition from "./scripts/listLabels.ts";
import listListsDefinition from "./scripts/listLists.ts";
import listOrganizationsDefinition from "./scripts/listOrganizations.ts";
import moveCardDefinition from "./scripts/moveCard.ts";
import removeCardLabelDefinition from "./scripts/removeCardLabel.ts";
import searchCardsDefinition from "./scripts/searchCards.ts";
import updateCardDefinition from "./scripts/updateCard.ts";

const connector = defineConnector({
  scripts: {
    addCardAttachment: addCardAttachmentDefinition,
    addCardLabel: addCardLabelDefinition,
    addCardMember: addCardMemberDefinition,
    addChecklistItem: addChecklistItemDefinition,
    addMemberToBoard: addMemberToBoardDefinition,
    archiveCard: archiveCardDefinition,
    closeBoard: closeBoardDefinition,
    completeChecklistItem: completeChecklistItemDefinition,
    copyBoard: copyBoardDefinition,
    createBoard: createBoardDefinition,
    createCard: createCardDefinition,
    createChecklist: createChecklistDefinition,
    createComment: createCommentDefinition,
    createLabel: createLabelDefinition,
    createList: createListDefinition,
    deleteChecklist: deleteChecklistDefinition,
    findBoard: findBoardDefinition,
    findChecklist: findChecklistDefinition,
    findChecklistItem: findChecklistItemDefinition,
    findLabel: findLabelDefinition,
    findList: findListDefinition,
    findOrganizationMember: findOrganizationMemberDefinition,
    getAction: getActionDefinition,
    getBoard: getBoardDefinition,
    getCard: getCardDefinition,
    getChecklist: getChecklistDefinition,
    getChecklistItem: getChecklistItemDefinition,
    getCurrentMember: getCurrentMemberDefinition,
    getLabel: getLabelDefinition,
    getList: getListDefinition,
    getMember: getMemberDefinition,
    getOrganization: getOrganizationDefinition,
    listBoardMembers: listBoardMembersDefinition,
    listBoards: listBoardsDefinition,
    listCardAttachments: listCardAttachmentsDefinition,
    listCards: listCardsDefinition,
    listCustomFields: listCustomFieldsDefinition,
    listLabels: listLabelsDefinition,
    listLists: listListsDefinition,
    listOrganizations: listOrganizationsDefinition,
    moveCard: moveCardDefinition,
    removeCardLabel: removeCardLabelDefinition,
    searchCards: searchCardsDefinition,
    updateCard: updateCardDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  addCardAttachment,
  addCardLabel,
  addCardMember,
  addChecklistItem,
  addMemberToBoard,
  archiveCard,
  closeBoard,
  completeChecklistItem,
  copyBoard,
  createBoard,
  createCard,
  createChecklist,
  createComment,
  createLabel,
  createList,
  deleteChecklist,
  findBoard,
  findChecklist,
  findChecklistItem,
  findLabel,
  findList,
  findOrganizationMember,
  getAction,
  getBoard,
  getCard,
  getChecklist,
  getChecklistItem,
  getCurrentMember,
  getLabel,
  getList,
  getMember,
  getOrganization,
  listBoardMembers,
  listBoards,
  listCardAttachments,
  listCards,
  listCustomFields,
  listLabels,
  listLists,
  listOrganizations,
  moveCard,
  removeCardLabel,
  searchCards,
  updateCard,
} = toFunctions(connector);
