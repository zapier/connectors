import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import auditPageDefinition from "./scripts/auditPage.ts";
import getAccountBalanceDefinition from "./scripts/getAccountBalance.ts";
import getAiKeywordSearchVolumeDefinition from "./scripts/getAiKeywordSearchVolume.ts";
import getBacklinkAnchorsDefinition from "./scripts/getBacklinkAnchors.ts";
import getBacklinksDefinition from "./scripts/getBacklinks.ts";
import getBacklinksBulkPagesSummaryDefinition from "./scripts/getBacklinksBulkPagesSummary.ts";
import getBacklinksSummaryDefinition from "./scripts/getBacklinksSummary.ts";
import getBusinessCategoriesAggregationDefinition from "./scripts/getBusinessCategoriesAggregation.ts";
import getChatGptResponseDefinition from "./scripts/getChatGptResponse.ts";
import getChatGptSearchResultsDefinition from "./scripts/getChatGptSearchResults.ts";
import getChatGptSearchResultsHtmlDefinition from "./scripts/getChatGptSearchResultsHtml.ts";
import getClaudeResponseDefinition from "./scripts/getClaudeResponse.ts";
import getDomainRankOverviewDefinition from "./scripts/getDomainRankOverview.ts";
import getGeminiResponseDefinition from "./scripts/getGeminiResponse.ts";
import getGoogleOrganicSerpDefinition from "./scripts/getGoogleOrganicSerp.ts";
import getHistoricalTrafficDefinition from "./scripts/getHistoricalTraffic.ts";
import getKeywordDifficultyDefinition from "./scripts/getKeywordDifficulty.ts";
import getKeywordOverviewDefinition from "./scripts/getKeywordOverview.ts";
import getKeywordSuggestionsDefinition from "./scripts/getKeywordSuggestions.ts";
import getLlmMentionsDefinition from "./scripts/getLlmMentions.ts";
import getLlmMentionsAggregatedMetricsDefinition from "./scripts/getLlmMentionsAggregatedMetrics.ts";
import getLlmMentionsCrossMetricsDefinition from "./scripts/getLlmMentionsCrossMetrics.ts";
import getLlmMentionsTopDomainsDefinition from "./scripts/getLlmMentionsTopDomains.ts";
import getLlmMentionsTopPagesDefinition from "./scripts/getLlmMentionsTopPages.ts";
import getOrganicTrafficDefinition from "./scripts/getOrganicTraffic.ts";
import getPerplexityResponseDefinition from "./scripts/getPerplexityResponse.ts";
import getRankedKeywordsDefinition from "./scripts/getRankedKeywords.ts";
import getReferringDomainsDefinition from "./scripts/getReferringDomains.ts";
import getRelatedKeywordsDefinition from "./scripts/getRelatedKeywords.ts";
import getSearchIntentDefinition from "./scripts/getSearchIntent.ts";
import getSearchVolumeDefinition from "./scripts/getSearchVolume.ts";
import listLocationsAndLanguagesDefinition from "./scripts/listLocationsAndLanguages.ts";
import searchBusinessListingsDefinition from "./scripts/searchBusinessListings.ts";

const connector = defineConnector({
  scripts: {
    auditPage: auditPageDefinition,
    getAccountBalance: getAccountBalanceDefinition,
    getAiKeywordSearchVolume: getAiKeywordSearchVolumeDefinition,
    getBacklinkAnchors: getBacklinkAnchorsDefinition,
    getBacklinks: getBacklinksDefinition,
    getBacklinksBulkPagesSummary: getBacklinksBulkPagesSummaryDefinition,
    getBacklinksSummary: getBacklinksSummaryDefinition,
    getBusinessCategoriesAggregation:
      getBusinessCategoriesAggregationDefinition,
    getChatGptResponse: getChatGptResponseDefinition,
    getChatGptSearchResults: getChatGptSearchResultsDefinition,
    getChatGptSearchResultsHtml: getChatGptSearchResultsHtmlDefinition,
    getClaudeResponse: getClaudeResponseDefinition,
    getDomainRankOverview: getDomainRankOverviewDefinition,
    getGeminiResponse: getGeminiResponseDefinition,
    getGoogleOrganicSerp: getGoogleOrganicSerpDefinition,
    getHistoricalTraffic: getHistoricalTrafficDefinition,
    getKeywordDifficulty: getKeywordDifficultyDefinition,
    getKeywordOverview: getKeywordOverviewDefinition,
    getKeywordSuggestions: getKeywordSuggestionsDefinition,
    getLlmMentions: getLlmMentionsDefinition,
    getLlmMentionsAggregatedMetrics: getLlmMentionsAggregatedMetricsDefinition,
    getLlmMentionsCrossMetrics: getLlmMentionsCrossMetricsDefinition,
    getLlmMentionsTopDomains: getLlmMentionsTopDomainsDefinition,
    getLlmMentionsTopPages: getLlmMentionsTopPagesDefinition,
    getOrganicTraffic: getOrganicTrafficDefinition,
    getPerplexityResponse: getPerplexityResponseDefinition,
    getRankedKeywords: getRankedKeywordsDefinition,
    getReferringDomains: getReferringDomainsDefinition,
    getRelatedKeywords: getRelatedKeywordsDefinition,
    getSearchIntent: getSearchIntentDefinition,
    getSearchVolume: getSearchVolumeDefinition,
    listLocationsAndLanguages: listLocationsAndLanguagesDefinition,
    searchBusinessListings: searchBusinessListingsDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  auditPage,
  getAccountBalance,
  getAiKeywordSearchVolume,
  getBacklinkAnchors,
  getBacklinks,
  getBacklinksBulkPagesSummary,
  getBacklinksSummary,
  getBusinessCategoriesAggregation,
  getChatGptResponse,
  getChatGptSearchResults,
  getChatGptSearchResultsHtml,
  getClaudeResponse,
  getDomainRankOverview,
  getGeminiResponse,
  getGoogleOrganicSerp,
  getHistoricalTraffic,
  getKeywordDifficulty,
  getKeywordOverview,
  getKeywordSuggestions,
  getLlmMentions,
  getLlmMentionsAggregatedMetrics,
  getLlmMentionsCrossMetrics,
  getLlmMentionsTopDomains,
  getLlmMentionsTopPages,
  getOrganicTraffic,
  getPerplexityResponse,
  getRankedKeywords,
  getReferringDomains,
  getRelatedKeywords,
  getSearchIntent,
  getSearchVolume,
  listLocationsAndLanguages,
  searchBusinessListings,
} = toFunctions(connector);
