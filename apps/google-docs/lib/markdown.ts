// Markdown → batchUpdate requests. createDocument and appendText accept a
// `markdown` flag; rendering is tractable here (and ONLY here) because run()
// owns the indices of the content it inserts — it inserts the body text first,
// then emits formatting requests against its own known offsets in one atomic
// batch. There is no foreign, shifting index, so the cross-call staleness
// hazard of editing existing content does not apply.
//
// Supported subset (maps to real batchUpdate requests):
//   - headings  #..######        → UpdateParagraphStyle namedStyleType HEADING_1..6
//   - bold      **text**         → UpdateTextStyle bold
//   - italic    *text* / _text_  → UpdateTextStyle italic
//   - links     [text](url)      → UpdateTextStyle link.url
//   - lists     -/*/+ and 1.     → CreateParagraphBullets presets
// Unsupported Markdown (tables, images, code fences, blockquotes) is inserted as
// literal text, never silently dropped.

import type { BatchUpdateRequest } from "./batchUpdate.ts";
import { bulletPresetFor } from "./paragraph.ts";
import { locationOf, rangeOf } from "./range.ts";

interface InlineSpan {
  start: number;
  end: number;
  bold?: boolean;
  italic?: boolean;
  link?: string;
}

const LINK_RE = /^\[([^\]]+)\]\(([^)]+)\)/;
const BOLD_RE = /^\*\*([^*]+)\*\*/;
const ITALIC_STAR_RE = /^\*([^*]+)\*/;
const ITALIC_UNDERSCORE_RE = /^_([^_]+)_/;
const ALNUM_RE = /[A-Za-z0-9]/;

/** Parse a line's inline markup into clean text + styled spans (offsets into clean text). */
function parseInline(src: string): { clean: string; spans: InlineSpan[] } {
  const spans: InlineSpan[] = [];
  let clean = "";
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    const link = LINK_RE.exec(rest);
    if (link) {
      const start = clean.length;
      const inner = parseInline(link[1]);
      for (const s of inner.spans) {
        spans.push({ ...s, start: s.start + start, end: s.end + start });
      }
      clean += inner.clean;
      spans.push({ start, end: clean.length, link: link[2] });
      i += link[0].length;
      continue;
    }
    const bold = BOLD_RE.exec(rest);
    if (bold) {
      const start = clean.length;
      clean += bold[1];
      spans.push({ start, end: clean.length, bold: true });
      i += bold[0].length;
      continue;
    }
    const starItalic = ITALIC_STAR_RE.exec(rest);
    if (starItalic) {
      const start = clean.length;
      clean += starItalic[1];
      spans.push({ start, end: clean.length, italic: true });
      i += starItalic[0].length;
      continue;
    }
    // `_` opens/closes emphasis only at word boundaries (CommonMark's intraword
    // rule), so identifiers like snake_case_name keep their underscores instead
    // of being italicized. (`*` emphasis is legitimately intraword, left as-is.)
    const underscoreItalic = ITALIC_UNDERSCORE_RE.exec(rest);
    if (
      underscoreItalic &&
      !ALNUM_RE.test(src[i - 1] ?? "") &&
      !ALNUM_RE.test(src[i + underscoreItalic[0].length] ?? "")
    ) {
      const start = clean.length;
      clean += underscoreItalic[1];
      spans.push({ start, end: clean.length, italic: true });
      i += underscoreItalic[0].length;
      continue;
    }
    clean += src[i];
    i += 1;
  }
  return { clean, spans };
}

type LineKind = "normal" | "heading" | "bullet" | "numbered";

interface ParsedLine {
  start: number; // offset into the full insert text (relative to anchor)
  end: number;
  kind: LineKind;
  level: number; // heading level 1..6, else 0
  spans: InlineSpan[];
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const BULLET_RE = /^[-*+]\s+(.*)$/;
const NUMBERED_RE = /^\d+\.\s+(.*)$/;

/**
 * Render `markdown` into an ordered batch of requests that inserts the text at
 * `anchorIndex` then styles it. The single InsertText is emitted first; every
 * styling request is index-stable (none change text length), so they reference
 * absolute indices that are correct once the insert has applied. `tabId` (when
 * given) is threaded into every Location/Range.
 */
export function renderMarkdownRequests(
  markdown: string,
  anchorIndex: number,
  tabId?: string,
): BatchUpdateRequest[] {
  const rawLines = markdown.split("\n");
  const parsed: ParsedLine[] = [];
  let text = "";

  rawLines.forEach((raw, idx) => {
    let kind: LineKind = "normal";
    let level = 0;
    let content = raw;
    const heading = HEADING_RE.exec(raw);
    const bullet = BULLET_RE.exec(raw);
    const numbered = NUMBERED_RE.exec(raw);
    if (heading) {
      kind = "heading";
      level = heading[1].length;
      content = heading[2];
    } else if (bullet) {
      kind = "bullet";
      content = bullet[1];
    } else if (numbered) {
      kind = "numbered";
      content = numbered[1];
    }
    const { clean, spans } = parseInline(content);
    const start = text.length;
    text += clean;
    const end = text.length;
    parsed.push({ start, end, kind, level, spans });
    if (idx < rawLines.length - 1) text += "\n";
  });

  const requests: BatchUpdateRequest[] = [];
  // 1. The single text insertion.
  requests.push({
    insertText: { text, location: locationOf(anchorIndex, tabId) },
  });

  // 2. Heading paragraph styles.
  for (const line of parsed) {
    if (line.kind === "heading" && line.end > line.start) {
      requests.push({
        updateParagraphStyle: {
          range: rangeOf(
            anchorIndex + line.start,
            anchorIndex + line.end,
            tabId,
          ),
          paragraphStyle: { namedStyleType: `HEADING_${line.level}` },
          fields: "namedStyleType",
        },
      });
    }
  }

  // 3. Bullets — group consecutive same-kind list lines into one request.
  let group: { kind: LineKind; from: number; to: number } | null = null;
  const flushGroup = (): void => {
    if (!group) return;
    requests.push({
      createParagraphBullets: {
        range: rangeOf(anchorIndex + group.from, anchorIndex + group.to, tabId),
        bulletPreset: bulletPresetFor(
          group.kind === "numbered" ? "numbered" : "bullet",
        ),
      },
    });
    group = null;
  };
  for (const line of parsed) {
    if (line.kind === "bullet" || line.kind === "numbered") {
      if (group && group.kind === line.kind) {
        group.to = line.end;
      } else {
        flushGroup();
        group = { kind: line.kind, from: line.start, to: line.end };
      }
    } else {
      flushGroup();
    }
  }
  flushGroup();

  // 4. Inline text styles.
  for (const line of parsed) {
    for (const span of line.spans) {
      const textStyle: Record<string, unknown> = {};
      const fields: string[] = [];
      if (span.bold) {
        textStyle.bold = true;
        fields.push("bold");
      }
      if (span.italic) {
        textStyle.italic = true;
        fields.push("italic");
      }
      if (span.link) {
        textStyle.link = { url: span.link };
        fields.push("link");
      }
      if (fields.length === 0) continue;
      requests.push({
        updateTextStyle: {
          range: rangeOf(
            anchorIndex + line.start + span.start,
            anchorIndex + line.start + span.end,
            tabId,
          ),
          textStyle,
          fields: fields.join(","),
        },
      });
    }
  }

  return requests;
}
