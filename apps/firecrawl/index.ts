import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import batchScrapeDefinition from "./scripts/batchScrape.ts";
import cancelAgentDefinition from "./scripts/cancelAgent.ts";
import cancelBatchScrapeDefinition from "./scripts/cancelBatchScrape.ts";
import cancelCrawlDefinition from "./scripts/cancelCrawl.ts";
import crawlDefinition from "./scripts/crawl.ts";
import createBrowserSessionDefinition from "./scripts/createBrowserSession.ts";
import deleteBrowserSessionDefinition from "./scripts/deleteBrowserSession.ts";
import executeBrowserCodeDefinition from "./scripts/executeBrowserCode.ts";
import findRelatedPapersDefinition from "./scripts/findRelatedPapers.ts";
import getActiveCrawlsDefinition from "./scripts/getActiveCrawls.ts";
import getActivityDefinition from "./scripts/getActivity.ts";
import getAgentStatusDefinition from "./scripts/getAgentStatus.ts";
import getBatchScrapeErrorsDefinition from "./scripts/getBatchScrapeErrors.ts";
import getBatchScrapeStatusDefinition from "./scripts/getBatchScrapeStatus.ts";
import getCrawlErrorsDefinition from "./scripts/getCrawlErrors.ts";
import getCrawlStatusDefinition from "./scripts/getCrawlStatus.ts";
import getCreditUsageDefinition from "./scripts/getCreditUsage.ts";
import getTokenUsageDefinition from "./scripts/getTokenUsage.ts";
import interactWithScrapeDefinition from "./scripts/interactWithScrape.ts";
import listBrowserSessionsDefinition from "./scripts/listBrowserSessions.ts";
import mapDefinition from "./scripts/map.ts";
import previewCrawlParamsDefinition from "./scripts/previewCrawlParams.ts";
import readPaperDefinition from "./scripts/readPaper.ts";
import scrapeDefinition from "./scripts/scrape.ts";
import searchDefinition from "./scripts/search.ts";
import searchDeveloperDefinition from "./scripts/searchDeveloper.ts";
import searchPapersDefinition from "./scripts/searchPapers.ts";
import startAgentDefinition from "./scripts/startAgent.ts";
import stopScrapeInteractDefinition from "./scripts/stopScrapeInteract.ts";

const connector = defineConnector({
  scripts: {
    batchScrape: batchScrapeDefinition,
    cancelAgent: cancelAgentDefinition,
    cancelBatchScrape: cancelBatchScrapeDefinition,
    cancelCrawl: cancelCrawlDefinition,
    crawl: crawlDefinition,
    createBrowserSession: createBrowserSessionDefinition,
    deleteBrowserSession: deleteBrowserSessionDefinition,
    executeBrowserCode: executeBrowserCodeDefinition,
    findRelatedPapers: findRelatedPapersDefinition,
    getActiveCrawls: getActiveCrawlsDefinition,
    getActivity: getActivityDefinition,
    getAgentStatus: getAgentStatusDefinition,
    getBatchScrapeErrors: getBatchScrapeErrorsDefinition,
    getBatchScrapeStatus: getBatchScrapeStatusDefinition,
    getCrawlErrors: getCrawlErrorsDefinition,
    getCrawlStatus: getCrawlStatusDefinition,
    getCreditUsage: getCreditUsageDefinition,
    getTokenUsage: getTokenUsageDefinition,
    interactWithScrape: interactWithScrapeDefinition,
    listBrowserSessions: listBrowserSessionsDefinition,
    map: mapDefinition,
    previewCrawlParams: previewCrawlParamsDefinition,
    readPaper: readPaperDefinition,
    scrape: scrapeDefinition,
    search: searchDefinition,
    searchDeveloper: searchDeveloperDefinition,
    searchPapers: searchPapersDefinition,
    startAgent: startAgentDefinition,
    stopScrapeInteract: stopScrapeInteractDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  batchScrape,
  cancelAgent,
  cancelBatchScrape,
  cancelCrawl,
  crawl,
  createBrowserSession,
  deleteBrowserSession,
  executeBrowserCode,
  findRelatedPapers,
  getActiveCrawls,
  getActivity,
  getAgentStatus,
  getBatchScrapeErrors,
  getBatchScrapeStatus,
  getCrawlErrors,
  getCrawlStatus,
  getCreditUsage,
  getTokenUsage,
  interactWithScrape,
  listBrowserSessions,
  map,
  previewCrawlParams,
  readPaper,
  scrape,
  search,
  searchDeveloper,
  searchPapers,
  startAgent,
  stopScrapeInteract,
} = toFunctions(connector);
