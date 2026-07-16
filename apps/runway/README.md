# @zapier/runway-connector

_Independent, unofficial connector for Runway. Not affiliated with, endorsed by, or sponsored by Runway. "Runway" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for [Runway](https://docs.dev.runwayml.com/)'s generative-media API (`https://api.dev.runwayml.com/v1`). Generate images and video from text or an image, edit/restyle and upscale existing media, animate a character from a driving performance, generate speech, sound effects, voice conversions and dubs, and run Runway's one-shot marketing "recipes" (product ads, campaign images, UGC, product swap, ad localization) — plus track the resulting generation jobs. Every generation is asynchronous: a tool returns a task id you poll with `getTask` (or pass `wait: true` to block), and finished asset URLs expire in 24-48 hours. Auth is a single Runway API secret (a bearer token), supplied directly or via a Zapier-managed connection.

## When to use this

- You want an agent to **create or transform media with Runway** — text/image → image or video, video restyle, upscale, character animation, speech/SFX/voice audio, or a packaged marketing recipe.
- You want to **track and manage** those generation jobs (poll status, cancel) and read credit/limit info, against a single API key.

## When NOT to use this

- **Runway's non-generation products** — Avatars, custom Voice management, Documents/knowledge, Realtime sessions, and saved Workflows are not covered.
- **Uploading local files** — there is no ephemeral-upload tool; asset inputs must be HTTPS URLs or data URIs. Host the asset first.
- **Real-time / synchronous media** — generation is asynchronous and can take minutes; this is not a low-latency streaming API.

## Install

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

```bash
# Run a script with zero install — npx fetches the package on first use
export RUNWAY_API_KEY=xxx
npx @zapier/runway-connector@latest run getOrganization '{}' --connection env:RUNWAY_API_KEY

# Install as a dependency to import the functions in your own code
npm install @zapier/runway-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills zapier/connectors --skill runway
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection`. The value is a _selector_, not the secret: `--connection zapier:<connection-id>` routes through Zapier-managed auth (recommended; no third-party secret enters the agent's environment, and the connection id isn't itself a secret so you can pass it as-is), and `--connection env:<ENV_VAR>` reads a direct token from `$<ENV_VAR>` (the token stays in `env`, never on argv). The `<resolver>:` prefix is optional — a bare value is claimed by the first matching resolver. See [`SKILL.md`](SKILL.md#auth) for tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "runway": {
      "command": "npx",
      "args": ["@zapier/runway-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

## Scripts

### Generate visual media

| Script                   | Description                                                                       |
| ------------------------ | --------------------------------------------------------------------------------- |
| `generateImage`          | Generate an image from a text prompt, optionally guided by 1-3 reference images.  |
| `generateVideoFromImage` | Generate a video that animates a source image, guided by a motion prompt.         |
| `generateVideoFromText`  | Generate a video from a text prompt alone.                                        |
| `editVideo`              | Transform or restyle an existing video with a text prompt (Aleph).                |
| `upscaleImage`           | Upscale an image to higher resolution.                                            |
| `upscaleVideo`           | Upscale a video to higher resolution.                                             |
| `animateCharacter`       | Animate a character by transferring a performance from a driving video (Act-Two). |

### Generate audio

| Script                | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `generateSpeech`      | Generate spoken audio from text, in a preset or cloned reference voice. |
| `generateSoundEffect` | Generate a sound effect from a text description.                        |
| `convertVoice`        | Replace the voice in an audio or video clip with a target voice.        |
| `dubAudio`            | Dub an audio clip into a target language.                               |
| `isolateVoice`        | Remove background audio and isolate the voice in a clip.                |

### Marketing recipes

| Script                   | Description                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `localizeAd`             | Localize an existing ad image for a target language.                               |
| `generateMarketingImage` | Generate a polished marketing stock image from a brief and optional brand logo.    |
| `generateMultiShotVideo` | Generate a multi-cut video from a story prompt or a custom shot list.              |
| `generateProductAd`      | Generate a cinematic product ad video from product images and creative direction.  |
| `generateCampaignImages` | Generate fashion campaign images from a product image and a style brief.           |
| `swapProduct`            | Replace the product in a reference video with a new product.                       |
| `generateProductUgc`     | Generate a vertical UGC-style ad from a character image, product image, and brief. |

### Track jobs & account

| Script            | Description                                                              |
| ----------------- | ------------------------------------------------------------------------ |
| `getTask`         | Get a generation task's status, progress, and finished asset URLs by id. |
| `cancelTask`      | Cancel a running task, or delete a completed one, by id.                 |
| `getOrganization` | Read the organization's tier limits and current credit balance.          |
| `getCreditUsage`  | Retrieve per-day, per-model credit usage over a date range.              |

Run `npx @zapier/runway-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:RUNWAY_API_KEY" }`.

```ts
import { generateImage, getTask } from "@zapier/runway-connector";

// Kick off an async generation — returns { id } by default.
const { data: task } = await generateImage(
  {
    promptText: "a red fox in snow, cinematic",
    ratio: "1920:1080",
    model: "gen4_image",
  },
  { connection: "env:RUNWAY_API_KEY" },
);

// Poll until it finishes; output URLs expire in 24-48h, so download them promptly.
const { data: result } = await getTask(
  { id: task.id },
  { connection: "env:RUNWAY_API_KEY" },
);
```

## Auth

Already have a connection value? Pass it as shown above — `--connection` for the CLI/MCP shapes, `{ connection }` for imported functions. No connection yet? Pick one:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Runway API docs](https://docs.dev.runwayml.com/)
- [Source](https://github.com/zapier/connectors/tree/main/apps/runway)

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Runway's API, services, data, schemas, documentation, or other materials, which remain the property of Runway. Your use of Runway's API is governed by your own agreement with Runway.

**Trademarks and affiliation.** Runway and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Runway.

**Your responsibility.** This connector calls Runway's API using credentials you supply. You are responsible for holding a valid Runway account, for complying with Runway's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Runway product. Zapier is not responsible for changes Runway makes to its API or for any consequence of your use of Runway's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
