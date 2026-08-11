# Gitlab text formatting (GitLab Flavored Markdown)

Load this when composing any body text you send to GitLab — an issue or merge-request description (`createIssue`, `createMergeRequest`, `updateIssue`, `updateMergeRequest`, `createWorkItem`, `updateWorkItem`) or a note/comment (`addIssueComment`, `addMergeRequestComment`, `addMergeRequestDiffComment`). GitLab renders these with GitLab Flavored Markdown (GLFM), not plain CommonMark, so a few things behave differently from generic Markdown.

## What GLFM is

"GitLab Flavored Markdown consists of the following: Core Markdown features, based on the CommonMark specification; Extensions from GitHub Flavored Markdown; Extensions made specifically for GitLab." So standard Markdown works, and there are GitLab-only extras on top.

## The one that bites: line breaks

"A line break is inserted (a new paragraph starts) if the previous text is ended with two newlines." A single newline keeps text in the same paragraph — contrast standard Markdown, where a single newline may not even be a soft break. When you build a multi-line description, separate paragraphs with a blank line (`\n\n`), not a single `\n`, or they collapse together.

## GitLab references (auto-linking)

GLFM turns short references into links to the referenced object:

- Issue — `#123`
- Merge request — `!123`
- Specific user — `@username` (also notifies them)

Only emit these when you have the real numeric id / username; a wrong `#123` links to an unrelated issue. When you're unsure, write plain text.

## Task lists

```markdown
- [x] Completed task
- [ ] Incomplete task
- [~] Inapplicable task
```

## Tables

"The first line contains the headers, separated by pipe characters (`|`). The second line separates the headers from the cells."

```markdown
| Header A | Header B |
| -------- | -------- |
| cell     | cell     |
```

## Fenced code blocks with highlighting

"To fence and apply syntax highlighting to a block of code, append the code language to the opening code declaration, after the three back-ticks."

````markdown
```ruby
puts "highlighted"
```
````

## Practical notes

- Descriptions accept a large body — `createIssue`'s own input notes a markdown body "up to ~1 MB"; don't count on the whole of a very large body surviving.
- Diff comments (`addMergeRequestDiffComment`) render their `body` as GLFM too, so the same rules apply inline on a diff line.
