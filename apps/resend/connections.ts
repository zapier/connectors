import {
  defineEnvTokenResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

export const connectionResolvers = {
  resend: [zapierConnectionResolver, defineEnvTokenResolver()],
} as const;
