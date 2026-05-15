#!/usr/bin/env -S node --experimental-strip-types
/**
 * `@zapier-agent-tools/notion` — single CLI entry.
 *
 * Wired into `package.json` `bin` so consumers can:
 *
 *   echo '{"query":"Q4 planning"}' | npx @zapier-agent-tools/notion run search
 *   npx @zapier-agent-tools/notion run create_database_item '{...}'
 *
 * The shorthand `npx @zapier-agent-tools/notion search '{...}'` also works
 * (when the script name doesn't collide with a reserved primary command —
 * today only `run`, `--help`, `-h`).
 *
 * All per-script CLI semantics (`--scheme=<key>`, positional JSON or
 * stdin, JSON output) are unchanged from invoking
 * `node apps/notion/scripts/<x>.ts` directly — `runDispatchCli` is a
 * dispatcher only, the per-script body still lives in `runCliBody`.
 *
 * Reserved namespace: `run` is the only primary command implemented today.
 * `recipe` (STAFF-3772) and the SKILL/references commands (STAFF-3764)
 * land in follow-ups against the same dispatcher.
 */

import { runDispatchCli } from "@zapier/skills";
import notion from "./index.ts";

await runDispatchCli(import.meta, notion);
