import {
  defineEnvTokenResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

export const connectionResolvers = {
  notion: [zapierConnectionResolver, defineEnvTokenResolver()],
} as const;
