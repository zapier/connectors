import {
  defineEnvTokenResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

export const connectionResolvers = {
  "microsoft-todo": [zapierConnectionResolver, defineEnvTokenResolver()],
} as const;
