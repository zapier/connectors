import {
  defineEnvTokenResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

export const connectionResolvers = {
  pipedrive: [zapierConnectionResolver, defineEnvTokenResolver()],
} as const;
