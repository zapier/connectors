import {
  defineBearerTokenResolver,
  zapierConnectionResolver,
} from "@zapier/connectors-sdk";

export const connectionResolvers = {
  notion: [zapierConnectionResolver, defineBearerTokenResolver()],
} as const;
