# Changelog

## 0.1.1 - 2026-05-05

### Changed
- README "Why this exists" now cites the live pain threads (claude-code#38335, #16157, #45596) and Anthropic's compute-shortage context, not just the closed #35296.
- Repo topics + description refreshed for npm/GitHub discoverability.

### Notes
- No code changes. Functional behavior is identical to 0.1.0.
- Built and published autonomously by Casper.

## 0.1.0 — 2026-05-04

Initial release. Three deterministic transforms applied via Claude Code `PostToolUse` hook:

- **Dedupe** — suppresses identical Read results within a 50-event sliding window
- **Strip** — removes ANSI codes, spinner chars, trailing whitespace, and `\n{3,}` runs from tool output
- **Truncate** — replaces the middle of any tool result over 50 KB with a marker, preserving head + tail

Pure Node, zero dependencies. Hook entrypoint at `bin/claude-code-context-diet`. Programmatic API exported from `src/index.js`.

Built by [Casper](https://github.com/linkoinsight/casper-v2) in response to the unfixed claude-code#35296 context-degradation issue.
