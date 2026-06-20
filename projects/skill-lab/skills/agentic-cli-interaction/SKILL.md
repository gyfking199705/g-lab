---
name: agentic-cli-interaction
description: Design and implement a terminal-style AI coding-agent interaction (REPL tool-loop, slash commands, streamed tool-call cards with diffs, tiered approval/sandbox, plan mode). Use when building a CLI/TUI coding agent or chat-in-terminal UX, or when asked how Claude Code / Codex / Gemini CLI / Aider / Cline-style tools structure their interaction.
license: MIT
allowed-tools: Read, Grep
metadata:
  category: AI & Agents
  version: 1.0.0
  author: g-lab/agent-cli
  tags: [agent, cli, tui, tool-use, ux, repl]
---

# Agentic CLI Interaction

Help an agent design (or critique) the interaction layer of a terminal coding
assistant so it feels like Claude Code / Codex CLI / Gemini CLI / Aider — not a
chat box bolted onto a shell. The patterns below are the ones those tools share.

## When to use

- Building a CLI/TUI AI coding agent, a "chat in the terminal", or a REPL agent.
- Designing how tool calls, diffs, approvals and streaming are presented.
- Someone asks "how does Claude Code / Codex / Aider structure its interaction?"

## Core model: a REPL tool-loop (not Q&A)

The agent runs a loop, not a single answer: **reason → call a tool → observe the
result → reason again**, repeating until the task is done or it needs the user
(this is the ReAct loop). Design every UI affordance around that loop.

## Workflow

1. **Composer**: one prompt line (`›`), Enter to send, Shift+Enter for newline.
   Treat a leading `/` as a slash command, everything else as a task.
2. **Slash commands + autocomplete**: `/help /clear /model /init` etc. in a
   popup; ↑/↓ to select, Tab to complete. Keep session actions out of the prose.
3. **Stream everything**: thinking, tool calls, command output and the answer
   appear as they happen; let the user interrupt with Esc/Ctrl+C.
4. **Render tool calls as cards**: `● Tool(arg)` then `⎿ result`; for edits show
   a line-level **diff** (green add / red remove). Make actions auditable.
5. **Gate risk by tiers (graded autonomy)**: e.g. suggest (approve every tool) /
   auto-edit (auto-write, confirm commands) / full-auto; pair with a sandbox or
   read-only boundary. Reads are usually safe to auto-approve.
6. **Plan mode**: offer a read-only "research & propose, don't touch code" mode;
   execute only after the user accepts the plan.
7. **Project memory**: read a repo file (CLAUDE.md / AGENTS.md / GEMINI.md) for
   conventions, commands and style so behavior persists across sessions.
8. **Close the loop**: end a run with a short stat line (tools · steps · time ·
   tokens) and keep history recallable (↑ for previous inputs).

## Guidelines

- Keep pure logic (command parsing, diffing, approval rules) out of the UI so it
  is testable; the renderer just plays an event stream.
- Make destructive/opaque actions visible and reversible (diffs, `/undo`, git).
- Extensibility belongs behind a protocol (MCP) so tools compose uniformly.

## Example

```
› add a clamp helper to utils and run tests
✻ Thinking: read the file first, match its style.
● Read(src/utils.js)        ⎿ 8 lines
● Edit(src/utils.js)        ⎿ +3 -0
  + export function clamp(n, lo, hi) {
  +   return Math.min(hi, Math.max(lo, n));
  + }
⏸ approve  Bash(npm test)?  [y/N]      ← gated in "suggest" mode
● Bash(npm test)            ⎿ ✓ all passing
✓ 2 个工具 · 2 步 · 1.3s · ≈90 tok
```

## Anti-patterns

- A plain chat bubble with no tool cards or diffs — the work becomes unauditable.
- Auto-running shell commands with no approval tier or sandbox.
- Blocking until the whole answer is ready instead of streaming and allowing Esc.
- Burying `/clear`-style session actions inside natural-language prompts.
