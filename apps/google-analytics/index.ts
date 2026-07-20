import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import archiveCustomDimensionDefinition from "./scripts/archiveCustomDimension.ts";
import archiveCustomMetricDefinition from "./scripts/archiveCustomMetric.ts";
import checkCompatibilityDefinition from "./scripts/checkCompatibility.ts";
import createCustomDimensionDefinition from "./scripts/createCustomDimension.ts";
import createCustomMetricDefinition from "./scripts/createCustomMetric.ts";
import createKeyEventDefinition from "./scripts/createKeyEvent.ts";
import createMeasurementProtocolSecretDefinition from "./scripts/createMeasurementProtocolSecret.ts";
import deleteKeyEventDefinition from "./scripts/deleteKeyEvent.ts";
import getKeyEventDefinition from "./scripts/getKeyEvent.ts";
import getMetadataDefinition from "./scripts/getMetadata.ts";
import getPropertyDefinition from "./scripts/getProperty.ts";
import listAccountSummariesDefinition from "./scripts/listAccountSummaries.ts";
import listCustomDimensionsDefinition from "./scripts/listCustomDimensions.ts";
import listCustomMetricsDefinition from "./scripts/listCustomMetrics.ts";
import listDataStreamsDefinition from "./scripts/listDataStreams.ts";
import listKeyEventsDefinition from "./scripts/listKeyEvents.ts";
import listMeasurementProtocolSecretsDefinition from "./scripts/listMeasurementProtocolSecrets.ts";
import runRealtimeReportDefinition from "./scripts/runRealtimeReport.ts";
import runReportDefinition from "./scripts/runReport.ts";
import sendEventDefinition from "./scripts/sendEvent.ts";

const connector = defineConnector({
  scripts: {
    archiveCustomDimension: archiveCustomDimensionDefinition,
    archiveCustomMetric: archiveCustomMetricDefinition,
    checkCompatibility: checkCompatibilityDefinition,
    createCustomDimension: createCustomDimensionDefinition,
    createCustomMetric: createCustomMetricDefinition,
    createKeyEvent: createKeyEventDefinition,
    createMeasurementProtocolSecret: createMeasurementProtocolSecretDefinition,
    deleteKeyEvent: deleteKeyEventDefinition,
    getKeyEvent: getKeyEventDefinition,
    getMetadata: getMetadataDefinition,
    getProperty: getPropertyDefinition,
    listAccountSummaries: listAccountSummariesDefinition,
    listCustomDimensions: listCustomDimensionsDefinition,
    listCustomMetrics: listCustomMetricsDefinition,
    listDataStreams: listDataStreamsDefinition,
    listKeyEvents: listKeyEventsDefinition,
    listMeasurementProtocolSecrets: listMeasurementProtocolSecretsDefinition,
    runRealtimeReport: runRealtimeReportDefinition,
    runReport: runReportDefinition,
    sendEvent: sendEventDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  archiveCustomDimension,
  archiveCustomMetric,
  checkCompatibility,
  createCustomDimension,
  createCustomMetric,
  createKeyEvent,
  createMeasurementProtocolSecret,
  deleteKeyEvent,
  getKeyEvent,
  getMetadata,
  getProperty,
  listAccountSummaries,
  listCustomDimensions,
  listCustomMetrics,
  listDataStreams,
  listKeyEvents,
  listMeasurementProtocolSecrets,
  runRealtimeReport,
  runReport,
  sendEvent,
} = toFunctions(connector);
