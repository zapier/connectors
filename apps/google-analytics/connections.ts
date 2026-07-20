import {
  defineEnvTokenResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

export const connectionResolvers = {
  "google-analytics": [zapierConnectionResolver, defineEnvTokenResolver()],
} as const;
