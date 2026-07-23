import { defineConnector, toFunctions } from "@zapier/connectors-sdk";

import { connectionResolvers } from "./connections.ts";
import cancelAllOrdersDefinition from "./scripts/cancelAllOrders.ts";
import cancelOrderDefinition from "./scripts/cancelOrder.ts";
import closeAllPositionsDefinition from "./scripts/closeAllPositions.ts";
import closePositionDefinition from "./scripts/closePosition.ts";
import exerciseOptionsPositionDefinition from "./scripts/exerciseOptionsPosition.ts";
import getAccountDefinition from "./scripts/getAccount.ts";
import getAccountConfigurationsDefinition from "./scripts/getAccountConfigurations.ts";
import getAssetDefinition from "./scripts/getAsset.ts";
import getClockDefinition from "./scripts/getClock.ts";
import getMarketCalendarDefinition from "./scripts/getMarketCalendar.ts";
import getOptionContractDefinition from "./scripts/getOptionContract.ts";
import getOrderDefinition from "./scripts/getOrder.ts";
import getOrderByClientOrderIdDefinition from "./scripts/getOrderByClientOrderId.ts";
import getPortfolioHistoryDefinition from "./scripts/getPortfolioHistory.ts";
import getPositionDefinition from "./scripts/getPosition.ts";
import getWatchlistDefinition from "./scripts/getWatchlist.ts";
import getWatchlistByNameDefinition from "./scripts/getWatchlistByName.ts";
import listAccountActivitiesDefinition from "./scripts/listAccountActivities.ts";
import listAssetsDefinition from "./scripts/listAssets.ts";
import listOptionContractsDefinition from "./scripts/listOptionContracts.ts";
import listOrdersDefinition from "./scripts/listOrders.ts";
import listPositionsDefinition from "./scripts/listPositions.ts";
import listWatchlistsDefinition from "./scripts/listWatchlists.ts";
import placeOrderDefinition from "./scripts/placeOrder.ts";
import replaceOrderDefinition from "./scripts/replaceOrder.ts";

const connector = defineConnector({
  scripts: {
    cancelAllOrders: cancelAllOrdersDefinition,
    cancelOrder: cancelOrderDefinition,
    closeAllPositions: closeAllPositionsDefinition,
    closePosition: closePositionDefinition,
    exerciseOptionsPosition: exerciseOptionsPositionDefinition,
    getAccount: getAccountDefinition,
    getAccountConfigurations: getAccountConfigurationsDefinition,
    getAsset: getAssetDefinition,
    getClock: getClockDefinition,
    getMarketCalendar: getMarketCalendarDefinition,
    getOptionContract: getOptionContractDefinition,
    getOrder: getOrderDefinition,
    getOrderByClientOrderId: getOrderByClientOrderIdDefinition,
    getPortfolioHistory: getPortfolioHistoryDefinition,
    getPosition: getPositionDefinition,
    getWatchlist: getWatchlistDefinition,
    getWatchlistByName: getWatchlistByNameDefinition,
    listAccountActivities: listAccountActivitiesDefinition,
    listAssets: listAssetsDefinition,
    listOptionContracts: listOptionContractsDefinition,
    listOrders: listOrdersDefinition,
    listPositions: listPositionsDefinition,
    listWatchlists: listWatchlistsDefinition,
    placeOrder: placeOrderDefinition,
    replaceOrder: replaceOrderDefinition,
  },
  connectionResolvers,
  meta: import.meta,
});

export default connector;
export const {
  cancelAllOrders,
  cancelOrder,
  closeAllPositions,
  closePosition,
  exerciseOptionsPosition,
  getAccount,
  getAccountConfigurations,
  getAsset,
  getClock,
  getMarketCalendar,
  getOptionContract,
  getOrder,
  getOrderByClientOrderId,
  getPortfolioHistory,
  getPosition,
  getWatchlist,
  getWatchlistByName,
  listAccountActivities,
  listAssets,
  listOptionContracts,
  listOrders,
  listPositions,
  listWatchlists,
  placeOrder,
  replaceOrder,
} = toFunctions(connector);
