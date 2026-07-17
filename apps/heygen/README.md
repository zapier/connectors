# @zapier/heygen-connector

_Independent, unofficial connector for Heygen. Not affiliated with, endorsed by, or sponsored by Heygen. "Heygen" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for **HeyGen**'s AI video platform, over the public [HeyGen v3 API](https://developers.heygen.com) (`https://api.heygen.com`). Generate AI avatar videos from a script or audio, produce short cinematic clips or fully agent-authored videos from a prompt, translate and lip-sync existing videos, synthesize speech, and browse the avatars and voices those jobs need. Video generation is **asynchronous** — a create tool returns an id you poll with the matching `get*` tool until the job completes. Authenticates with a long-lived HeyGen API key sent as the `X-Api-Key` header (via Zapier-managed or direct connection).

## When to use this

- **Create AI videos** — an avatar or animated image speaking a script or audio (`createVideo`), a short cinematic clip from a prompt (`createCinematicVideo`), or a fully agent-authored video (`createVideoAgentVideo`).
- **Transform existing videos** — translate into other languages (`translateVideo`) or replace the audio and re-sync the lips (`createLipsync`).
- **Synthesize speech and manage voices/avatars** — text-to-speech (`generateSpeech`), design or clone voices, and browse the avatar looks and voices the create tools need.
- **Track async jobs and credits** — poll a video / translation / lipsync / session by id, list past jobs, and check the remaining credit balance (`getCurrentUser`) before generating.

## When NOT to use this

- **Multi-scene "Studio" videos** (a different avatar/background per scene) and **template-based generation** aren't supported — build those in the HeyGen web app.
- **Uploading local files** isn't supported — pass a public HTTPS URL to the `*_url` inputs instead.
- It drives HeyGen's generation / translation / lip-sync APIs — it is **not** a general-purpose video editor.

## Install

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

```bash
# Run a script with zero install — npx fetches the package on first use
export HEYGEN_API_KEY=xxx
npx @zapier/heygen-connector@latest run createVideo '<input-json>' --connection env:HEYGEN_API_KEY

# Install as a dependency to import the functions in your own code
npm install @zapier/heygen-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills zapier/connectors --skill heygen
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection`. The value is a _selector_, not the secret: `--connection zapier:<connection-id>` routes through Zapier-managed auth (recommended; no third-party secret enters the agent's environment, and the connection id isn't itself a secret so you can pass it as-is), and `--connection env:<ENV_VAR>` reads a direct token from `$<ENV_VAR>` (the token stays in `env`, never on argv). The `<resolver>:` prefix is optional — a bare value is claimed by the first matching resolver. See [`SKILL.md`](SKILL.md#auth) for tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "heygen": {
      "command": "npx",
      "args": ["@zapier/heygen-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

## Scripts

| Script                     | Description                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `createVideo`              | Generate an avatar or image video from a script or audio; returns a `video_id` to poll with `getVideo`. |
| `createCinematicVideo`     | Generate a short (4–15s) cinematic clip from a prompt and 1–3 avatar looks.                             |
| `getVideo`                 | Poll a video's status and, once complete, get its result URLs (video, thumbnail, captions, share page). |
| `listVideos`               | List videos in the account, filterable by folder or title.                                              |
| `deleteVideo`              | Permanently delete a video and its files.                                                               |
| `generateSpeech`           | Synthesize speech audio from text (TTS) using a Starfish-compatible voice.                              |
| `listVoices`               | List voices; filter by type, engine, language, or gender. Resolver for `voice_id`.                      |
| `designVoice`              | Generate candidate voices from a natural-language description.                                          |
| `cloneVoice`               | Clone a voice from a reference audio file; poll readiness with `getVoice`.                              |
| `getVoice`                 | Get one voice's details and clone/training status by id.                                                |
| `listAvatarLooks`          | List avatar looks. Resolver for `avatar_id` (a look id is the avatar_id).                               |
| `listAvatarGroups`         | List avatar groups (each holds one or more looks).                                                      |
| `getAvatarLook`            | Get one avatar look's details by look id.                                                               |
| `getAvatarGroup`           | Get one avatar group's details by group id.                                                             |
| `createAvatar`             | Start asynchronous avatar creation from a prompt or media URLs.                                         |
| `updateAvatarLook`         | Rename an avatar look.                                                                                  |
| `translateVideo`           | Translate a video into one or more languages; returns one id per language.                              |
| `getVideoTranslation`      | Poll a video-translation job and get the translated video URL.                                          |
| `listVideoTranslations`    | List video-translation jobs.                                                                            |
| `listTranslationLanguages` | List the languages supported for video translation.                                                     |
| `createLipsync`            | Replace the audio on a video and re-animate the speaker's lips to match.                                |
| `getLipsync`               | Poll a lipsync job and get the output video URL.                                                        |
| `listLipsyncs`             | List lipsync jobs.                                                                                      |
| `createVideoAgentVideo`    | Start a Video Agent session that plans and generates a video from a prompt.                             |
| `getVideoAgentSession`     | Get a Video Agent session's status, resulting `video_id`, and messages.                                 |
| `sendVideoAgentMessage`    | Send a follow-up or revision to a chat-mode Video Agent session.                                        |
| `listVideoAgentSessions`   | List Video Agent sessions.                                                                              |
| `getCurrentUser`           | Get the account's profile and remaining credit balance.                                                 |

Run `npx @zapier/heygen-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:HEYGEN_API_KEY" }`.

```ts
import { createVideo, getVideo } from "@zapier/heygen-connector";

// Start an avatar video, then poll until it's ready.
const { data: created } = await createVideo(
  {
    type: "avatar",
    avatar_id: "<look-id>",
    script: "Hello from HeyGen!",
    voice_id: "<voice-id>",
  },
  { connection: "env:HEYGEN_API_KEY" },
);

const { data: video } = await getVideo(
  { video_id: created.video_id },
  { connection: "env:HEYGEN_API_KEY" },
);
console.log(video.status); // e.g. "waiting" → poll until "completed"
```

## Auth

Already have a connection value? Pass it as shown above — `--connection` for the CLI/MCP shapes, `{ connection }` for imported functions. No connection yet? Pick one:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Links

- [HeyGen API docs](https://developers.heygen.com)
- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Source](https://github.com/zapier/connectors/tree/main/apps/heygen)

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Heygen's API, services, data, schemas, documentation, or other materials, which remain the property of Heygen. Your use of Heygen's API is governed by your own agreement with Heygen.

**Trademarks and affiliation.** Heygen and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Heygen.

**Your responsibility.** This connector calls Heygen's API using credentials you supply. You are responsible for holding a valid Heygen account, for complying with Heygen's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Heygen product. Zapier is not responsible for changes Heygen makes to its API or for any consequence of your use of Heygen's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
