// Strip ANSI, trailing whitespace, spinner chars, repeated blank lines.

const ANSI_PATTERN = /\x1b\[[0-9;]*[A-Za-z]/g;
const SPINNER_CHARS = /[⠀-⣿▀-▟●◦]/g;
const TRAILING_WS = /[ \t]+$/gm;
const MULTI_BLANK = /\n{3,}/g;

export function stripNoise(text, config) {
  if (typeof text !== "string" || text.length === 0) return { text, applied: false };
  const before = text.length;
  let out = text;
  const enabled = new Set(config.stripPatterns ?? []);

  if (enabled.has("ansi")) out = out.replace(ANSI_PATTERN, "");
  if (enabled.has("spinner_chars")) out = out.replace(SPINNER_CHARS, "");
  if (enabled.has("trailing_whitespace")) out = out.replace(TRAILING_WS, "");
  if (enabled.has("duplicate_blank_lines")) out = out.replace(MULTI_BLANK, "\n\n");

  return { text: out, applied: out.length !== before };
}
