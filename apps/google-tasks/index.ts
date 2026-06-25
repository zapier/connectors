import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import clearCompletedTasksDefinition from "./scripts/clearCompletedTasks.ts";
import createTaskDefinition from "./scripts/createTask.ts";
import createTaskListDefinition from "./scripts/createTaskList.ts";
import deleteTaskDefinition from "./scripts/deleteTask.ts";
import deleteTaskListDefinition from "./scripts/deleteTaskList.ts";
import findTaskDefinition from "./scripts/findTask.ts";
import getTaskDefinition from "./scripts/getTask.ts";
import getTaskListDefinition from "./scripts/getTaskList.ts";
import listTaskListsDefinition from "./scripts/listTaskLists.ts";
import listTasksDefinition from "./scripts/listTasks.ts";
import moveTaskDefinition from "./scripts/moveTask.ts";
import updateTaskDefinition from "./scripts/updateTask.ts";
import updateTaskListDefinition from "./scripts/updateTaskList.ts";

const connector = defineConnector({
  scripts: {
    clearCompletedTasks: clearCompletedTasksDefinition,
    createTask: createTaskDefinition,
    createTaskList: createTaskListDefinition,
    deleteTask: deleteTaskDefinition,
    deleteTaskList: deleteTaskListDefinition,
    findTask: findTaskDefinition,
    getTask: getTaskDefinition,
    getTaskList: getTaskListDefinition,
    listTaskLists: listTaskListsDefinition,
    listTasks: listTasksDefinition,
    moveTask: moveTaskDefinition,
    updateTask: updateTaskDefinition,
    updateTaskList: updateTaskListDefinition,
  },
  connectionResolvers,
});

export default connector;
export const {
  clearCompletedTasks,
  createTask,
  createTaskList,
  deleteTask,
  deleteTaskList,
  findTask,
  getTask,
  getTaskList,
  listTaskLists,
  listTasks,
  moveTask,
  updateTask,
  updateTaskList,
} = toFunctions(connector);
