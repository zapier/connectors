# Linear Markdown formatting

The Markdown-composing tools — `createComment.body`, `createIssue`/`updateIssue`
`description`, `createProjectUpdate.body`, and `createProject.description` — all
write into Linear's rich-text editor, which accepts Markdown. Below is the
formatting surface Linear actually renders, with each vendor claim sourced to a
public Linear doc linked inline. Two features (`@`-mentions and `+++`
collapsible sections) use Linear-specific Markdown syntax that differs from
generic Markdown — get those wrong and the content renders as plain text.

## Standard Markdown is accepted and converted to rich text

Linear's editor takes Markdown and converts it in place: "We support most
Markdown elements in our text editor. Type in Markdown or paste it directly and
it will be converted into rich text automatically."
([Editor](https://linear.app/docs/editor))

The documented formatting options include text styles (**bold**, _italic_,
strikethrough, inline code), **headings** (levels 1–4), bulleted and numbered
lists, checklists, blockquotes, links, code blocks, tables, horizontal dividers,
mermaid diagrams, and collapsible sections.
([Editor](https://linear.app/docs/editor))

So for the common cases — headings, lists, bold/italic, links, blockquotes —
write plain GitHub-flavored Markdown into any of the body/description fields and
it renders as expected.

## Checklists / todos

A checklist is a first-class element. The editor shortcut is documented as
"`[]` or Cmd/Ctrl Shift 7 for a checklist" — i.e. a `[]` prefix begins a
checklist item.
([Editor](https://linear.app/docs/editor))

## Code blocks

Code blocks are supported; the editor shortcut is "`/code` or Cmd/Ctrl Shift \\
for a code block."
([Editor](https://linear.app/docs/editor)) In Markdown, use standard fenced code
blocks (triple backticks). A code block "beginning with ` ```mermaid `" renders
as a mermaid diagram.
([Editor](https://linear.app/docs/editor))

## Mentions: use the resource's plain URL (not `@name`)

This is the biggest API-vs-app difference. In the app you type `@` — "Write
`@text` to mention a user, issue, project, date, or document in a description or
comment."
([Editor](https://linear.app/docs/editor)) But over the **GraphQL API** there is
no `@`-picker; you paste the resource's URL and Linear turns it into a mention:
"In the GraphQL API, mentions can be created in Markdown by using the plain URL
of the resource."
([Adding mentions in Markdown](https://linear.app/developers/graphql#adding-mentions-in-markdown))

You can mention users, issues, projects, and other resources this way. Example
from the docs — the raw URLs render as inline `@`-mentions:

```md
https://linear.app/yourworkspaceurl/profiles/someuser what do you think about
https://linear.app/yourworkspaceurl/issue/LIN-123/some-issue here?
```

([Adding mentions in Markdown](https://linear.app/developers/graphql#adding-mentions-in-markdown))
So when composing a body/description programmatically, emit the bare
`https://linear.app/...` URL where you want the mention — don't try `@name`.

## Collapsible sections: `+++` delimiters

Collapsible (toggle) sections use a Linear-specific delimiter. "For collapsible
sections in an issue, comment, or document, use `+++ [some section title]` to
start the section and `+++` to end it."
([Adding collapsible sections in Markdown](https://linear.app/developers/graphql#adding-collapsible-sections-in-markdown))
The content between the delimiters is initially hidden. Shape:

```md
+++ Section title

Markdown content (initially hidden)

+++
```

([Adding collapsible sections in Markdown](https://linear.app/developers/graphql#adding-collapsible-sections-in-markdown))

> Note: Linear's in-app editor also offers `/collapsible` and a `>>>` text
> shortcut for the same feature
> ([Collapsible sections changelog](https://linear.app/changelog/2025-03-19-collapsible-sections)),
> but the **API Markdown** surface is the `+++ … +++` form documented above —
> use `+++` when composing bodies through these tools.

See also
[`references/linear-api-gotchas.md`](linear-api-gotchas.md) for the broader API
behavior (auth, error envelope, ids, pagination).
