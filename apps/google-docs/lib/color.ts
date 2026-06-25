// Hex → Google API color conversion. formatText and updateDocumentStyle both
// accept agent-friendly #RRGGBB strings (the API's {red,green,blue} 0-1 floats
// are not how anyone thinks about color). Conversion is shared so the
// reject-on-unparseable-hex behavior stays identical across both tools — a
// silent black-on-bad-input default corrupts output, so we surface the error.

/** The Docs API `Color` shape: an RGB color with 0-1 float channels. */
export interface ApiColor {
  color: { rgbColor: { red: number; green: number; blue: number } };
}

const HEX_RE = /^#?([0-9a-fA-F]{6})$/;

/**
 * Convert a `#RRGGBB` (or bare `RRGGBB`) hex string to the Docs API color shape.
 * Throws on an unparseable value rather than defaulting to black/white — a
 * silent default would corrupt the document.
 */
export function hexToApiColor(hex: string, fieldName: string): ApiColor {
  const match = HEX_RE.exec(hex.trim());
  if (!match) {
    throw new Error(
      `Invalid ${fieldName} "${hex}": expected a hex color like #1A2B3C (#RRGGBB).`,
    );
  }
  const int = parseInt(match[1], 16);
  return {
    color: {
      rgbColor: {
        red: ((int >> 16) & 0xff) / 255,
        green: ((int >> 8) & 0xff) / 255,
        blue: (int & 0xff) / 255,
      },
    },
  };
}
