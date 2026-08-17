import {
  defineEnvTokenResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

export const connectionResolvers = {
  firecrawl: [zapierConnectionResolver, defineEnvTokenResolver()],
} as const;
