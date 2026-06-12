# @zapier/dropbox-connector

Agent-callable Dropbox tools — upload, organize, find, and share files and folders. This connector wraps the [Dropbox API v2](https://www.dropbox.com/developers/documentation/http/documentation) with 21 tools spanning file writes (upload, create/append text), organization (move, copy, delete, create folders), navigation and search, inline content reading, shared links, shared-folder membership, and file requests. Auth is a single Dropbox OAuth2 connection — capability is gated by the scopes granted at connect time, and the recommended Zapier-managed path rotates the short-lived access token for you.

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

## Install

```bash
# Run a tool with zero install — npx fetches the package on first use
DROPBOX_ACCESS_TOKEN=xxx npx @zapier/dropbox-connector run <toolName> '{ ... }'

# Install as a dependency to import the tools in your own code
npm install @zapier/dropbox-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills zapier/connectors --skill dropbox
```

Credentials are environment-variable only (never passed on argv). Use `DROPBOX_ZAPIER_CONNECTION_ID=<id>` instead of `DROPBOX_ACCESS_TOKEN` to route through Zapier-managed auth (recommended — no third-party secret enters the agent's environment, and Zapier rotates the short-lived token for you); see [`SKILL.md`](SKILL.md#auth) for tradeoffs and how to find a connection ID.

## Tools

Run `npx @zapier/dropbox-connector run <toolName> --help` to see any tool's exact input contract + which auth env vars are set.

**Files — write & organize**

| Tool               | Description                                                                       |
| ------------------ | --------------------------------------------------------------------------------- |
| `uploadFile`       | Upload a file by fetching its bytes from a URL (chunked session for large files). |
| `createTextFile`   | Create or overwrite a Dropbox file from plain text content.                       |
| `appendToTextFile` | Append text to a text file, creating it if it doesn't exist.                      |
| `createFolder`     | Create a folder at a path.                                                        |
| `moveFile`         | Move or rename a file or folder.                                                  |
| `copyFile`         | Copy a file or folder to a new path.                                              |
| `deletePath`       | Delete a file or folder (recoverable for a limited time).                         |

**Files — read & navigate**

| Tool               | Description                                                 |
| ------------------ | ----------------------------------------------------------- |
| `listFolder`       | List a folder's immediate contents (cursor-paged).          |
| `searchFiles`      | Search files and folders by name or content (cursor-paged). |
| `getFileMetadata`  | Get metadata for one file or folder by path or id.          |
| `getTemporaryLink` | Get a ~4-hour direct download URL for a file.               |
| `getFileContents`  | Read a text file's inline content (UTF-8, size-capped).     |

**Sharing**

| Tool                       | Description                                                                   |
| -------------------------- | ----------------------------------------------------------------------------- |
| `createSharedLink`         | Create a durable shareable link (returns the existing one if present).        |
| `modifySharedLinkSettings` | Change an existing shared link's visibility, password, expiration, or access. |
| `listSharedLinks`          | List existing shared links, optionally for one path.                          |
| `listSharedFolders`        | List the shared folders the account belongs to.                               |
| `addFolderMember`          | Add members (by email) to a shared folder.                                    |
| `removeFolderMember`       | Remove a member from a shared folder.                                         |

**File requests & account**

| Tool                | Description                                                             |
| ------------------- | ----------------------------------------------------------------------- |
| `createFileRequest` | Create a public upload page into a Dropbox folder.                      |
| `listFileRequests`  | List the account's file requests.                                       |
| `getCurrentAccount` | Identify the authenticated account and its team/personal namespace ids. |

## Usage

```ts
import { searchFiles, getTemporaryLink } from "@zapier/dropbox-connector";

// Each named export is the consumer-facing (input, opts) => Promise<output>.
const found = await searchFiles({ query: "Q4 forecast" });
const link = await getTemporaryLink({ path: found.matches[0].path_lower });
console.log(link.link); // direct download URL, valid ~4 hours
```

## MCP Server

Add one stanza to any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) to auto-discover the tools over stdio:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "dropbox": {
      "command": "npx",
      "args": ["@zapier/dropbox-connector", "mcp"],
      "env": {
        "DROPBOX_ZAPIER_CONNECTION_ID": "<connection-id>"
      }
    }
  }
}
```

Swap `DROPBOX_ZAPIER_CONNECTION_ID` for `DROPBOX_ACCESS_TOKEN` if you don't have a Zapier account.

## When to use this

Reach for this connector when an agent needs to manage Dropbox files and folders: saving generated content, organizing or cleaning up a folder, finding a file before acting on it, reading a text file inline, or sharing files/folders with people. It returns clean file metadata and resolves shared-link recovery, large-file uploads, and team-space targeting for you.

## When NOT to use this

- **Triggers / polling for new or changed files.** This is a non-trigger connector; use a Zapier trigger or webhook for "when a file is added/updated."
- **Reading binary documents as text (PDF/image/Office), OCR, or document parsing.** `getFileContents` is UTF-8 text only; hand off other files' bytes via `getTemporaryLink`.
- **Dropbox Business/team admin** (member management, team folders, groups) and **Dropbox Paper** — out of scope here.

## Links

- [Dropbox HTTP API reference](https://www.dropbox.com/developers/documentation/http/documentation) — the vendor API this wraps
- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [`references/dropbox-api-gotchas.md`](references/dropbox-api-gotchas.md) — durable per-app API knowledge
- [Source](https://github.com/zapier/connectors/tree/main/apps/dropbox)
