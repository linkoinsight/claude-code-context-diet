// claude-code-context-diet
// Compresses Claude Code tool outputs before they re-enter the conversation context.
//
// This is the programmatic API. For the hook entrypoint that Claude Code spawns,
// see src/cli.js.

import { dedupeReads } from "./transforms/dedupe.js";
import { truncateOversize } from "./transforms/truncate.js";
import { stripNoise } from "./transforms/strip.js";

export const DEFAULT_CONFIG = {
  // Truncation kicks in once a single tool result exceeds this many bytes.
  maxBytesPerResult: 50000,
  // When truncating, keep this many bytes from head and tail.
  keepHeadBytes: 8000,
  keepTailBytes: 4000,
  // Dedupe identical Read results within a sliding window.
  dedupeWindowSize: 50,
  // Strip patterns: ANSI codes, trailing whitespace, spinners, repeated blanks.
  stripPatterns: ["ansi", "trailing_whitespace", "spinner_chars", "duplicate_blank_lines"],
  // Local-only stderr telemetry; opt-in.
  emitTelemetry: false,
};

export function compress(toolEvent, state, configOverride) {
  const config = { ...DEFAULT_CONFIG, ...(configOverride ?? {}) };
  const before = byteLength(toolEvent.result);
  let result = toolEvent.result;

  if (toolEvent.toolName === "Read") {
    const deduped = dedupeReads(toolEvent, state, config);
    if (deduped.skip) {
      return {
        toolEvent: { ...toolEvent, result: deduped.placeholder },
        bytesBefore: before,
        bytesAfter: byteLength(deduped.placeholder),
        appliedTransforms: ["dedupe"],
      };
    }
  }

  const stripped = stripNoise(result, config);
  result = stripped.text;

  const truncated = truncateOversize(result, config);
  result = truncated.text;

  return {
    toolEvent: { ...toolEvent, result },
    bytesBefore: before,
    bytesAfter: byteLength(result),
    appliedTransforms: [
      ...(stripped.applied ? ["strip"] : []),
      ...(truncated.applied ? ["truncate"] : []),
    ],
  };
}

export function makeState() {
  return { recentReads: [] };
}

function byteLength(s) {
  if (typeof s !== "string") return 0;
  return Buffer.byteLength(s, "utf8");
}
