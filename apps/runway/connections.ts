import {
  defineEnvTokenResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

export const connectionResolvers = {
  runway: [zapierConnectionResolver, defineEnvTokenResolver()],
} as const;
