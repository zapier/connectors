// Shared paragraph-level request builders for the list + paragraph-style tools
// (createList, removeListFormatting, formatParagraph) AND the Markdown renderer.
// Lifting them here keeps the standalone tools and the `markdown: true` path
// emitting identical CreateParagraphBullets / UpdateParagraphStyle requests, so
// the two surfaces can't drift (a cross-tool-consistency hazard otherwise).

/** Bullet presets for the two list styles (mirrors the Docs API enum). */
const BULLET_PRESET = {
  bullet: "BULLET_DISC_CIRCLE_SQUARE",
  numbered: "NUMBERED_DECIMAL_ALPHA_ROMAN",
} as const;

export type ListStyle = keyof typeof BULLET_PRESET;

/** Map a friendly list style to the Docs API `bulletPreset`. */
export function bulletPresetFor(style: ListStyle): string {
  return BULLET_PRESET[style];
}

/** Friendly named-style → Docs API `namedStyleType`. */
const NAMED_STYLE = {
  normal: "NORMAL_TEXT",
  title: "TITLE",
  subtitle: "SUBTITLE",
  heading1: "HEADING_1",
  heading2: "HEADING_2",
  heading3: "HEADING_3",
  heading4: "HEADING_4",
  heading5: "HEADING_5",
  heading6: "HEADING_6",
} as const;

export type NamedStyle = keyof typeof NAMED_STYLE;

export function namedStyleTypeFor(named: NamedStyle): string {
  return NAMED_STYLE[named];
}

/** Friendly alignment → Docs API `Alignment` (LTR semantics). */
const ALIGNMENT = {
  left: "START",
  center: "CENTER",
  right: "END",
  justified: "JUSTIFIED",
} as const;

export type Alignment = keyof typeof ALIGNMENT;

export function alignmentFor(alignment: Alignment): string {
  return ALIGNMENT[alignment];
}

/** A points Dimension, the unit the Docs API uses for spacing/indent. */
function pt(magnitude: number): { magnitude: number; unit: "PT" } {
  return { magnitude, unit: "PT" };
}

/** The paragraph-style inputs formatParagraph accepts (all optional). */
export interface ParagraphStyleInputs {
  namedStyle?: NamedStyle;
  alignment?: Alignment;
  lineSpacing?: number; // percent of single: 100 = single, 150 = 1.5x
  spaceAbove?: number; // points
  spaceBelow?: number; // points
  indentStart?: number; // points
  indentFirstLine?: number; // points
}

/**
 * Build the `paragraphStyle` object and the matching `fields` mask from whichever
 * inputs are set. The Docs API requires `fields` to name every property being
 * changed; an unset property is left untouched. Returns an empty `fields` array
 * when nothing is set so the caller can reject the no-op call.
 */
export function buildParagraphStyle(inputs: ParagraphStyleInputs): {
  paragraphStyle: Record<string, unknown>;
  fields: string[];
} {
  const paragraphStyle: Record<string, unknown> = {};
  const fields: string[] = [];

  if (inputs.namedStyle !== undefined) {
    paragraphStyle.namedStyleType = namedStyleTypeFor(inputs.namedStyle);
    fields.push("namedStyleType");
  }
  if (inputs.alignment !== undefined) {
    paragraphStyle.alignment = alignmentFor(inputs.alignment);
    fields.push("alignment");
  }
  if (inputs.lineSpacing !== undefined) {
    paragraphStyle.lineSpacing = inputs.lineSpacing;
    fields.push("lineSpacing");
  }
  if (inputs.spaceAbove !== undefined) {
    paragraphStyle.spaceAbove = pt(inputs.spaceAbove);
    fields.push("spaceAbove");
  }
  if (inputs.spaceBelow !== undefined) {
    paragraphStyle.spaceBelow = pt(inputs.spaceBelow);
    fields.push("spaceBelow");
  }
  if (inputs.indentStart !== undefined) {
    paragraphStyle.indentStart = pt(inputs.indentStart);
    fields.push("indentStart");
  }
  if (inputs.indentFirstLine !== undefined) {
    paragraphStyle.indentFirstLine = pt(inputs.indentFirstLine);
    fields.push("indentFirstLine");
  }

  return { paragraphStyle, fields };
}
