---
name: conventional-commits
description: Write clear, structured Git commit messages following the Conventional Commits 1.0 spec. Use when committing changes, drafting a commit message, or normalizing messy commit history into a consistent, machine-readable format that drives semantic versioning and changelogs.
license: MIT
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Read
metadata:
  category: Git & Version Control
  version: 1.1.0
  author: g-lab/skill-lab
  tags: [git, commits, conventional-commits, semver, changelog]
---

# Conventional Commits

Produce commit messages that are consistent, scannable, and machine-parseable so
that tooling can derive semantic version bumps and changelogs automatically.

## When to use

- The user asks you to commit changes or write a commit message.
- You need to normalize an existing message before committing.
- A repo uses `commitlint`, `semantic-release`, or Conventional Commits in CONTRIBUTING.

## Format

```
<type>(<optional scope>): <description>

<optional body>

<optional footer(s)>
```

- **type** — one of: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- **scope** — the area touched, e.g. `feat(auth):`. Optional but encouraged.
- **description** — imperative mood, lower-case, no trailing period, ≤ 72 chars.
- **body** — what & why (not how); wrap at ~72 cols. Optional.
- **footer** — `BREAKING CHANGE: …`, or issue refs like `Closes #123`.

## Workflow

1. Inspect the staged change with `git diff --staged` to understand the intent.
2. Pick the single most accurate `type`. If a change spans concerns, prefer
   splitting into multiple commits over one vague message.
3. Write the description in the imperative: "add", not "added" / "adds".
4. Add a body only when the *why* is non-obvious from the description.
5. Mark incompatible changes with a `!` after the type/scope **and** a
   `BREAKING CHANGE:` footer.

## Rules of thumb

- A breaking change → triggers a **major** bump; `feat` → **minor**; `fix` → **patch**.
- One logical change per commit. If you wrote "and" in the description, reconsider.
- Never invent a scope that doesn't map to the codebase.

## Examples

```
feat(parser): support trailing commas in array literals

fix(api): return 404 instead of 500 for unknown user ids

refactor(store)!: drop the deprecated sync() method

BREAKING CHANGE: sync() is removed; use save() which is async.

docs: add troubleshooting section to README

Closes #142
```
