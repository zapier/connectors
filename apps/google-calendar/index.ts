import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import addEventAttendeesDefinition from "./scripts/addEventAttendees.ts";
import createAclRuleDefinition from "./scripts/createAclRule.ts";
import createCalendarDefinition from "./scripts/createCalendar.ts";
import createEventDefinition from "./scripts/createEvent.ts";
import deleteAclRuleDefinition from "./scripts/deleteAclRule.ts";
import deleteEventDefinition from "./scripts/deleteEvent.ts";
import getCalendarDefinition from "./scripts/getCalendar.ts";
import getColorsDefinition from "./scripts/getColors.ts";
import getEventDefinition from "./scripts/getEvent.ts";
import listAclRulesDefinition from "./scripts/listAclRules.ts";
import listCalendarsDefinition from "./scripts/listCalendars.ts";
import listEventInstancesDefinition from "./scripts/listEventInstances.ts";
import listEventsDefinition from "./scripts/listEvents.ts";
import moveEventDefinition from "./scripts/moveEvent.ts";
import queryFreeBusyDefinition from "./scripts/queryFreeBusy.ts";
import quickAddEventDefinition from "./scripts/quickAddEvent.ts";
import updateEventDefinition from "./scripts/updateEvent.ts";

const connector = defineConnector({
  scripts: {
    addEventAttendees: addEventAttendeesDefinition,
    createAclRule: createAclRuleDefinition,
    createCalendar: createCalendarDefinition,
    createEvent: createEventDefinition,
    deleteAclRule: deleteAclRuleDefinition,
    deleteEvent: deleteEventDefinition,
    getCalendar: getCalendarDefinition,
    getColors: getColorsDefinition,
    getEvent: getEventDefinition,
    listAclRules: listAclRulesDefinition,
    listCalendars: listCalendarsDefinition,
    listEventInstances: listEventInstancesDefinition,
    listEvents: listEventsDefinition,
    moveEvent: moveEventDefinition,
    queryFreeBusy: queryFreeBusyDefinition,
    quickAddEvent: quickAddEventDefinition,
    updateEvent: updateEventDefinition,
  },
  connectionResolvers,
});

export default connector;
export const {
  addEventAttendees,
  createAclRule,
  createCalendar,
  createEvent,
  deleteAclRule,
  deleteEvent,
  getCalendar,
  getColors,
  getEvent,
  listAclRules,
  listCalendars,
  listEventInstances,
  listEvents,
  moveEvent,
  queryFreeBusy,
  quickAddEvent,
  updateEvent,
} = toFunctions(connector);
