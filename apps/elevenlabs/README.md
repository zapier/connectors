# @zapier/elevenlabs-connector

_Independent, unofficial connector for Elevenlabs. Not affiliated with, endorsed by, or sponsored by Elevenlabs. "Elevenlabs" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for [ElevenLabs](https://elevenlabs.io/docs/api-reference/introduction), the AI audio platform. Generate speech from text in any of your account's voices, create sound effects and multi-speaker dialogue, re-voice or clean up existing audio, transcribe audio and video, design brand-new synthetic voices from a text description, and manage your voices, generation history, and subscription quota. Generated audio is written to a local file and returned as a path by default (base64 inline on request). Auth is a single ElevenLabs API key, passed directly or through a Zapier-managed connection.

## When to use this

- Turning text into spoken audio — narration, voiceovers, spoken replies — in a chosen or purpose-designed voice.
- Audio utility jobs: transcribe a recording or video, strip background noise, re-voice speech in another voice, or re-download something generated earlier without paying credits again.
- Managing an ElevenLabs account's voices (search the community library, add/remove voices, design new ones) and keeping an eye on credit quota.

## When NOT to use this

- Real-time/streaming audio, conversational agents, dubbing studio, and music generation — this connector covers single-call generation only; use ElevenLabs' own SDKs for those surfaces.
- Cloning a voice from sample recordings (instant/professional voice cloning) — not included in this connector.
- Editing or mixing audio files locally — this connector only transforms audio through the ElevenLabs API.

## Install

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

```bash
# Run a script with zero install — npx fetches the package on first use
export <ENV_VAR>=xxx
npx @zapier/elevenlabs-connector@latest run <script> '<input-json>' --connection env:<ENV_VAR>

# Install as a dependency to import the functions in your own code
npm install @zapier/elevenlabs-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills add zapier/connectors --skill elevenlabs
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection` — a _selector_, not the secret. The `<resolver>:` prefix is optional; a bare value is claimed by the first matching resolver. See [Auth](#auth) below for the with/without-Zapier tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "elevenlabs": {
      "command": "npx",
      "args": ["@zapier/elevenlabs-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

## Scripts

| Script                  | Description                                                                       |
| ----------------------- | --------------------------------------------------------------------------------- |
| `textToSpeech`          | Convert text to spoken audio in a chosen voice.                                   |
| `createSoundEffect`     | Generate a sound effect (not speech) from a text description.                     |
| `textToDialogue`        | Generate a multi-speaker audio conversation from a list of lines.                 |
| `speechToSpeech`        | Re-voice existing speech in a different voice (voice changer).                    |
| `isolateAudio`          | Remove background noise, music, and ambience from a recording.                    |
| `speechToText`          | Transcribe speech from an audio or video URL, with timestamps and speaker labels. |
| `designVoice`           | Design a new synthetic voice from a text description; returns candidate previews. |
| `createVoiceFromDesign` | Save a designed voice to the account so textToSpeech can use it.                  |
| `listVoices`            | List the account's voices — the voice_id resolver.                                |
| `getVoice`              | Get one voice's full metadata by id.                                              |
| `searchVoiceLibrary`    | Search the shared community voice library by characteristics.                     |
| `addSharedVoice`        | Add a community library voice to the account.                                     |
| `deleteVoice`           | Remove a voice from the account (frees a voice slot).                             |
| `listModels`            | List models with capabilities and per-request character limits.                   |
| `listHistory`           | List previously generated audio items with filters.                               |
| `getHistoryItem`        | Get one generation's metadata by id.                                              |
| `downloadHistoryAudio`  | Re-fetch the audio of a previous generation without paying credits again.         |
| `deleteHistoryItem`     | Permanently delete one generated item from history.                               |
| `getUserSubscription`   | Check tier, credit usage/limit, reset time, and voice-slot usage.                 |

Run `npx @zapier/elevenlabs-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:<ENV_VAR>" }`.

```ts
import { textToSpeech } from "@zapier/elevenlabs-connector";

const { data } = await textToSpeech(
  { voice_id: "JBFqnCBsd6RMkjVDRZzb", text: "Welcome to the show." },
  { connection: "env:<ENV_VAR>" },
);
// data.audio_path — local MP3 file; data.history_item_id — re-download key.
```

The `{ data, meta }` envelope is uniform across SDK, CLI, and MCP; `meta.outputDataValidation` reports what output validation did, and `--skipOutputDataValidation` (CLI) / `{ skipOutputDataValidation: true }` (SDK) / `meta: { skipOutputDataValidation: true }` (MCP) returns the raw, unvalidated output.

## Auth

Already have a connection value? Pass it as shown above — `--connection` for the CLI/MCP shapes, `{ connection }` for imported functions. No connection yet? Pick one:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Source](https://github.com/zapier/connectors/tree/main/apps/elevenlabs)
- [ElevenLabs API documentation](https://elevenlabs.io/docs/api-reference/introduction)

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Elevenlabs's API, services, data, schemas, documentation, or other materials, which remain the property of Elevenlabs. Your use of Elevenlabs's API is governed by your own agreement with Elevenlabs.

**Trademarks and affiliation.** Elevenlabs and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Elevenlabs.

**Your responsibility.** This connector calls Elevenlabs's API using credentials you supply. You are responsible for holding a valid Elevenlabs account, for complying with Elevenlabs's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Elevenlabs product. Zapier is not responsible for changes Elevenlabs makes to its API or for any consequence of your use of Elevenlabs's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
