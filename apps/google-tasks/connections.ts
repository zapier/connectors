import {
  defineEnvTokenResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

export const connectionResolvers = {
  "google-tasks": [zapierConnectionResolver, defineEnvTokenResolver()],
} as const;
