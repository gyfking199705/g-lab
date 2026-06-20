---
name: pr-description
description: Draft a clear, reviewer-friendly pull request description from a branch's diff and commits. Use when opening a PR, summarizing a set of changes for review, or filling out a PR template with a What/Why/How-to-test breakdown.
license: MIT
allowed-tools: Bash(git diff:*), Bash(git log:*), Read
metadata:
  category: Git & Version Control
  version: 1.0.0
  author: g-lab/skill-lab
  tags: [git, pull-request, code-review, documentation]
---

# Pull Request Description

Turn a branch of changes into a PR description that a reviewer can act on in one
pass — what changed, why, and how to verify it.

## When to use

- Opening a pull/merge request.
- The repo has a PR template to fill in.
- Someone asks "summarize this branch for review".

## Gather context first

1. `git log --oneline main..HEAD` — the story of the branch.
2. `git diff --stat main..HEAD` — the blast radius (files & line counts).
3. Skim the actual diff for anything a reviewer would flag (migrations, config,
   public API, security-sensitive code).

## Structure

```markdown
## What
One or two sentences: the user-visible or system-visible change.

## Why
The problem, ticket, or motivation. Link the issue (`Closes #123`).

## How
Key implementation decisions and trade-offs. Call out anything non-obvious.

## How to test
Concrete steps or commands a reviewer runs to verify.

## Notes / risks
Migrations, breaking changes, follow-ups, or "out of scope" items.
```

## Guidelines

- Lead with impact, not a file-by-file recap — the diff already lists files.
- Keep it honest: surface known gaps, TODOs, and risky areas explicitly.
- If the PR is large, add a short "Review guide" pointing to the entry point.
- Use a checklist for multi-part work so reviewers can track progress.
- Match the repo's existing template and tone if one exists.

## Anti-patterns

- "Various fixes and improvements" — says nothing; be specific.
- Pasting the raw commit list as the whole description.
- Hiding a breaking change in paragraph three instead of a **Risks** callout.
