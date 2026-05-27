#!/usr/bin/env node
import { runDispatchCli } from "@zapier/connectors-sdk";

import connector from "./index.ts";

await runDispatchCli(import.meta, connector);
