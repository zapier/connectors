#!/usr/bin/env -S node --experimental-strip-types
import { runDispatchCli } from "@zapier/connectors-sdk";
import bundle from "./index.ts";

await runDispatchCli(import.meta, bundle.scripts);
