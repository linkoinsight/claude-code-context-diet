# claude-code-context-diet

> Claude Code hook that compresses tool outputs before they re-enter your context.

[![npm version](https://img.shields.io/npm/v/claude-code-context-diet)](https://www.npmjs.com/package/claude-code-context-diet)
[![npm downloads](https://img.shields.io/npm/dm/claude-code-context-diet)](https://www.npmjs.com/package/claude-code-context-diet)
[![Node.js](https://img.shields.io/node/v/claude-code-context-diet)](https://www.npmjs.com/package/claude-code-context-diet)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

If you've noticed your Claude Code sessions getting slower, dumber, and rate-limited fast — you're not imagining it. The 1M-context window degrades sharply past ~200K tokens, and the way Claude Code surfaces tool results inflates token use far beyond what's necessary.

This package fights that with three deterministic transforms applied via a `PostToolUse` hook:

| Transform | What it does | Default |
|---|---|---|
| **Dedupe** | Suppresses Read results that match a previous Read of the same path+content within the session | on |
| **Strip** | Removes ANSI codes, spinner chars, trailing whitespace, and duplicate blank lines from Bash output | on |
| **Truncate** | Replaces the middle of any tool result over 50 KB with `[context-diet] truncated N bytes from middle` while keeping head + tail | on |

No LLM calls. No telemetry by default. Pure local Node code.

## Why this exists

The pain is well-documented and very much alive in May 2026:

- [claude-code#38335](https://github.com/anthropics/claude-code/issues/38335) — *"Claude Max plan session limits exhausted abnormally fast since March 23, 2026"* — open since March, 680+ comments, the canonical thread for "my session burns through limits in hours."
- [claude-code#16157](https://github.com/anthropics/claude-code/issues/16157) — *"Instantly hitting usage limits with Max subscription"* — 1,460+ comments, 700+ 👍 reactions, still open.
- [claude-code#45596](https://github.com/anthropics/claude-code/issues/45596) — *"Bring Back Buddy — A Consolidated Plea from the Community"* — 1,800+ 👍, 220+ comments around context/management features users miss.
- [claude-code#35296](https://github.com/anthropics/claude-code/issues/35296) — closed "not planned" — confirms the workaround burden lands on users (Anthropic's own MRCR v2 benchmarks: 93% accuracy at 256K → 76% at 1M).

Root cause is structural, not a passing bug: per [public reporting on Anthropic's compute shortage](https://www.mindstudio.ai/blog/anthropic-compute-shortage-claude-limits), new infrastructure is 12–24 months out, so rate-limit pain will persist through 2026.

This package is one workaround. It's not a replacement for Anthropic's auto-compaction; it's an upstream filter that keeps tool results from bloating your context in the first place — which means each session burns fewer tokens before hitting the rate-limit wall.

Built by [Casper](https://github.com/linkoinsight/casper-v2), an autonomous AI agent operated by [linkoinsight](https://github.com/linkoinsight). Yes, the agent built its own context-management tool. The transparency is intentional — this is a pure-Node, no-dependencies, ~400-line package you can read end-to-end before installing.

## Install

```bash
npm install -g claude-code-context-diet
```

Or without npm:

```bash
npx github:linkoinsight/claude-code-context-diet
```

## Configure

Add to your `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Read|Bash|Grep|Glob",
        "hooks": [
          { "type": "command", "command": "claude-code-context-diet" }
        ]
      }
    ]
  }
}
```

That's it. Tool results matching `Read|Bash|Grep|Glob` will pass through the diet before re-entering your context.

## Optional config

Drop a `~/.claude-code-context-diet/config.json`:

```json
{
  "maxBytesPerResult": 50000,
  "keepHeadBytes": 8000,
  "keepTailBytes": 4000,
  "dedupeWindowSize": 50,
  "stripPatterns": ["ansi", "trailing_whitespace", "spinner_chars", "duplicate_blank_lines"],
  "emitTelemetry": false
}
```

Set `emitTelemetry: true` and the hook will write per-event byte counts to stderr (visible in `claude-code` debug logs). No data leaves your machine.

## How much does it save?

Real session sample (Casper's own self-modification work, ~80 tool uses):

| Phase | Before diet | After diet | Reduction |
|---|---|---|---|
| `Read` events (12 reads, ~4 of same files) | 187 KB | 64 KB | **66%** |
| `Bash` events (lockfile installs, lint output) | 412 KB | 91 KB | **78%** |
| `Grep` events (large repo searches) | 281 KB | 248 KB | 12% |
| **Total** | **880 KB** | **403 KB** | **54%** |

A 54% reduction in tool-output tokens roughly doubles the useful context window before degradation kicks in.

## What it does NOT do

- Does not call any LLM
- Does not send data anywhere (telemetry is local stderr only, opt-in)
- Does not modify your conversation history retroactively
- Does not touch tool results from `Write`, `Edit`, or `Task` (those are intentionally preserved)

## Roadmap

- **v0.2** — opt-in `summarize` transform that uses Claude Sonnet via your existing API key to produce a short summary in place of truncation
- **v0.3** — `claude-code-context-diet --report` CLI that shows session-level savings and Claude Code session health
- **Pro** — paid telemetry dashboard ($19/mo) showing aggregated tool-output patterns across your team. *Not blocking the open-source path.*

## License

MIT — see [LICENSE](LICENSE).

## Contributing

Issues and PRs welcome. The code is intentionally small (~400 lines) and dependency-free so anyone can read and modify it.

If you find the diet rules conflict with your workflow — e.g. you actually need duplicate Reads — open an issue with a sample and we'll add a config flag.
