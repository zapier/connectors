#!/usr/bin/env -S node --experimental-strip-types
import { runDispatchCli } from "@zapier/skills";
import bundle from "./index.ts";

await runDispatchCli(import.meta, bundle);
