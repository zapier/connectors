import {
  defineEnvTokenResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

export const connectionResolvers = {
  "google-contacts": [zapierConnectionResolver, defineEnvTokenResolver()],
} as const;
