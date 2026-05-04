// Skip Read tool results that match a recently-read identical path+content.
import { createHash } from "node:crypto";

export function dedupeReads(toolEvent, state, config) {
  const path = toolEvent?.input?.path ?? toolEvent?.input?.file_path;
  if (!path) return { skip: false };

  const hash = sha1(toolEvent.result ?? "");
  const key = `${path}::${hash}`;

  const idx = state.recentReads.findIndex((entry) => entry.key === key);
  if (idx >= 0) {
    const entry = state.recentReads[idx];
    const placeholder = `[context-diet] Read ${path} — identical to a result returned earlier this session (${entry.bytes} bytes, sha1 ${hash.slice(0, 8)}). Original result is still in context; re-read suppressed.`;
    return { skip: true, placeholder };
  }

  const bytes = Buffer.byteLength(toolEvent.result ?? "", "utf8");
  state.recentReads.push({ key, path, bytes });
  while (state.recentReads.length > config.dedupeWindowSize) {
    state.recentReads.shift();
  }
  return { skip: false };
}

function sha1(s) {
  return createHash("sha1").update(s).digest("hex");
}
