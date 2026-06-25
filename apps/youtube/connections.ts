import {
  defineEnvTokenResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

export const connectionResolvers = {
  youtube: [zapierConnectionResolver, defineEnvTokenResolver()],
} as const;
