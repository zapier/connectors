import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import completeTaskDefinition from "./scripts/completeTask.ts";
import createChecklistItemDefinition from "./scripts/createChecklistItem.ts";
import createListDefinition from "./scripts/createList.ts";
import createTaskDefinition from "./scripts/createTask.ts";
import deleteChecklistItemDefinition from "./scripts/deleteChecklistItem.ts";
import deleteListDefinition from "./scripts/deleteList.ts";
import deleteTaskDefinition from "./scripts/deleteTask.ts";
import findTaskDefinition from "./scripts/findTask.ts";
import getListDefinition from "./scripts/getList.ts";
import getTaskDefinition from "./scripts/getTask.ts";
import listChecklistItemsDefinition from "./scripts/listChecklistItems.ts";
import listListsDefinition from "./scripts/listLists.ts";
import listTasksDefinition from "./scripts/listTasks.ts";
import updateChecklistItemDefinition from "./scripts/updateChecklistItem.ts";
import updateListDefinition from "./scripts/updateList.ts";
import updateTaskDefinition from "./scripts/updateTask.ts";

const connector = defineConnector({
  scripts: {
    completeTask: completeTaskDefinition,
    createChecklistItem: createChecklistItemDefinition,
    createList: createListDefinition,
    createTask: createTaskDefinition,
    deleteChecklistItem: deleteChecklistItemDefinition,
    deleteList: deleteListDefinition,
    deleteTask: deleteTaskDefinition,
    findTask: findTaskDefinition,
    getList: getListDefinition,
    getTask: getTaskDefinition,
    listChecklistItems: listChecklistItemsDefinition,
    listLists: listListsDefinition,
    listTasks: listTasksDefinition,
    updateChecklistItem: updateChecklistItemDefinition,
    updateList: updateListDefinition,
    updateTask: updateTaskDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  completeTask,
  createChecklistItem,
  createList,
  createTask,
  deleteChecklistItem,
  deleteList,
  deleteTask,
  findTask,
  getList,
  getTask,
  listChecklistItems,
  listLists,
  listTasks,
  updateChecklistItem,
  updateList,
  updateTask,
} = toFunctions(connector);
