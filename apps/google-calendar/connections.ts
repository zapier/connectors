import {
  defineEnvTokenResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

export const connectionResolvers = {
  "google-calendar": [zapierConnectionResolver, defineEnvTokenResolver()],
} as const;
