---
name: error-handling
description: Design robust error handling — fail fast, fail loud, recover deliberately, and never swallow errors silently. Use when adding error handling to new code, hardening a flaky integration, or reviewing code that hides or mishandles failures.
license: MIT
allowed-tools: Read, Grep
metadata:
  category: Code Quality
  version: 1.0.0
  author: g-lab/skill-lab
  tags: [error-handling, reliability, exceptions, resilience]
---

# Error Handling

Make failures visible, contextual, and recoverable — so a small problem doesn't
become a silent corruption.

## When to use

- Adding error handling to new code paths.
- Hardening calls to flaky externals (network, disk, third-party APIs).
- Reviewing code that catches-and-ignores or fails obscurely.

## Core principles

- **Fail fast**: validate inputs and preconditions at the boundary; reject bad
  state early rather than limping on with it.
- **Fail loud**: surface errors with context. A swallowed exception is a bug you
  won't find until it's expensive.
- **Catch what you can handle.** Catching just to log-and-continue usually hides
  a real failure — let it propagate to someone who can decide.
- **Preserve the cause**: wrap, don't replace. Add context (`"loading config: %w"`)
  while keeping the original error/stack for debugging.

## Anti-patterns to remove

- Empty catch blocks; `catch (e) {}` / `except: pass` — silent data loss.
- Catching the broadest type (`Exception`/`catch (e)`) and ignoring it.
- Returning `null`/`-1`/`""` for errors so callers forget to check — prefer
  throwing or a typed `Result`/`Option`.
- Logging *and* rethrowing at every layer → duplicate noise. Handle once.
- Using exceptions for normal control flow.

## Recovery & resilience

- For transient failures (network, locks): **retry with backoff + jitter** and a
  cap; make the operation idempotent so retries are safe.
- Add **timeouts** to every external call; a hang is worse than an error.
- Consider a **circuit breaker / fallback** for a dependency that's down.
- **Clean up** with `finally` / `defer` / context managers so resources (files,
  connections, locks) are released on every path.

## User- vs system-facing

- Users get a clear, actionable message — never a raw stack trace or internal
  detail (that's an info leak).
- Operators get the full error, cause, and context in structured logs.

## Checklist

- Does every external call have a timeout and a defined failure behavior?
- Is any error caught and ignored? Is any failure returned as a magic value?
- On failure, is state left consistent (no half-written data, leaked handles)?
