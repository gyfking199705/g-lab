---
name: code-reviewer
description: Review a code diff for correctness, security, and maintainability, returning prioritized, actionable findings. Use when asked to review a change, audit a pull request, or sanity-check code before merging — focusing on real bugs over style nits.
license: MIT
allowed-tools: Bash(git diff:*), Read, Grep
metadata:
  category: Code Quality
  version: 1.2.0
  author: g-lab/skill-lab
  tags: [code-review, quality, security, bugs, refactoring]
---

# Code Reviewer

Give a focused review that catches what matters: correctness bugs, security
holes, and maintainability traps — ranked so the author fixes the important
things first.

## When to use

- "Review this PR / diff / change."
- Pre-merge sanity check.
- Auditing unfamiliar code before depending on it.

## Review order (high signal first)

1. **Correctness** — off-by-one, null/undefined, error handling, edge cases,
   race conditions, wrong boolean logic, incorrect async/await.
2. **Security** — injection (SQL/shell/HTML), secrets in code, missing
   authz/authn checks, unsafe deserialization, path traversal, SSRF.
3. **Data & resource safety** — unbounded loops/memory, leaked handles,
   N+1 queries, missing transactions, migration reversibility.
4. **API & contracts** — breaking changes, inconsistent error shapes, unclear
   nullability, backward compatibility.
5. **Maintainability** — duplicated logic, dead code, misleading names,
   functions doing too much, missing tests for new branches.
6. **Style** — only if it impairs readability; defer to the project's linter.

## How to report

For each finding use:

```
[severity] file:line — problem, then the concrete fix.
```

- **severity**: `blocker` · `major` · `minor` · `nit`.
- Be specific and actionable — show the corrected snippet when small.
- Distinguish *certain bugs* from *questions*; phrase uncertainty as a question.
- Lead with a one-line verdict: approve / approve-with-nits / request-changes.

## Principles

- Prefer fewer, higher-confidence findings over an exhaustive nit list.
- Don't rewrite to taste — respect the surrounding code's conventions.
- Praise is cheap and useful: note a genuinely good pattern when you see one.
- If you can't see enough context to judge, say so instead of guessing.

## Checklist for new code paths

- Are the new branches and error cases covered by tests?
- What happens on empty input, huge input, and concurrent calls?
- Does it fail loudly and safely, or silently corrupt state?
