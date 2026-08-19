import {
  defineEnvTokenResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

export const connectionResolvers = {
  perplexity: [zapierConnectionResolver, defineEnvTokenResolver()],
} as const;
