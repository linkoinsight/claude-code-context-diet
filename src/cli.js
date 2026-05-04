#!/usr/bin/env node
// Claude Code hook entrypoint.
//
// Claude Code spawns this for matching events (PostToolUse for Read/Bash/etc.),
// passes the event JSON via stdin, and reads the modified event from stdout.
// See: https://docs.claude.com/en/docs/claude-code/hooks
//
// Configure in .claude/settings.json:
//   {
//     "hooks": {
//       "PostToolUse": [{
//         "matcher": "Read|Bash|Grep",
//         "hooks": [{ "type": "command", "command": "claude-code-context-diet" }]
//       }]
//     }
//   }

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { compress, makeState, DEFAULT_CONFIG } from "./index.js";

const STATE_DIR = process.env.CONTEXT_DIET_STATE_DIR ?? join(homedir(), ".claude-code-context-diet");
const STATE_FILE = join(STATE_DIR, "state.json");

async function main() {
  const input = await readStdin();
  if (!input.trim()) process.exit(0);

  let event;
  try {
    event = JSON.parse(input);
  } catch {
    process.stdout.write(input);
    process.exit(0);
  }

  const state = await loadState();
  const config = await loadConfig();
  const tool = event?.tool_name ?? event?.toolName;
  const toolEvent = {
    toolName: tool,
    input: event?.tool_input ?? event?.toolInput ?? {},
    result: event?.tool_response?.output ?? event?.toolResponse?.output ?? event?.result ?? "",
  };

  if (!toolEvent.result || typeof toolEvent.result !== "string") {
    process.stdout.write(input);
    process.exit(0);
  }

  let outcome;
  try {
    outcome = compress(toolEvent, state, config);
  } catch (e) {
    process.stderr.write(`[context-diet] error: ${e.message}\n`);
    process.stdout.write(input);
    process.exit(0);
  }

  await saveState(state);

  if (event.tool_response) event.tool_response.output = outcome.toolEvent.result;
  else if (event.toolResponse) event.toolResponse.output = outcome.toolEvent.result;
  else event.result = outcome.toolEvent.result;

  if (config.emitTelemetry) {
    process.stderr.write(
      `[context-diet] ${tool}: ${outcome.bytesBefore}B -> ${outcome.bytesAfter}B (${outcome.appliedTransforms.join(",") || "noop"})\n`,
    );
  }

  process.stdout.write(JSON.stringify(event));
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function loadState() {
  try {
    const raw = await readFile(STATE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return makeState();
  }
}

async function saveState(state) {
  try {
    await mkdir(STATE_DIR, { recursive: true });
    await writeFile(STATE_FILE, JSON.stringify(state), "utf8");
  } catch {
    // Best-effort; never block the user's session.
  }
}

async function loadConfig() {
  const path = process.env.CONTEXT_DIET_CONFIG ?? join(homedir(), ".claude-code-context-diet", "config.json");
  try {
    const raw = await readFile(path, "utf8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

main().catch((e) => {
  process.stderr.write(`[context-diet] fatal: ${e.message}\n`);
  process.exit(0);
});
