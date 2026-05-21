#!/usr/bin/env -S node --experimental-strip-types
import { runDispatchCli } from "@zapier/connectors-sdk";
import connector from "./index.ts";

await runDispatchCli(import.meta, connector.scripts);
