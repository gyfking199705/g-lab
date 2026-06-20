---
name: git-rebase-helper
description: Safely rebase, squash, and clean up Git branch history, and resolve rebase conflicts without losing work. Use when tidying commits before a PR, updating a feature branch onto main, untangling a messy history, or recovering from a rebase that went wrong.
license: MIT
allowed-tools: Bash(git status:*), Bash(git log:*), Bash(git rebase:*), Bash(git diff:*), Bash(git reflog:*), Read
metadata:
  category: Git & Version Control
  version: 1.0.0
  author: g-lab/skill-lab
  tags: [git, rebase, history, conflicts, squash]
---

# Git Rebase Helper

Reshape branch history cleanly and reversibly — and always have a way back.

## When to use

- Cleaning up commits before opening a PR.
- Updating a feature branch onto the latest base.
- Squashing fixups, reordering, or rewording commits.
- Recovering from a rebase that went sideways.

## Before you start (safety)

1. **Commit or stash** everything; a rebase needs a clean tree.
2. Note the current tip: `git branch backup/before-rebase` — a free undo.
3. Remember **`git reflog`** is the universal undo: `git reset --hard HEAD@{n}`
   restores the pre-rebase state.
4. **Never rebase shared/public history** others have pulled. Rewrite only your
   own un-pushed (or solely-yours) branch.

## Common operations

- **Update onto base**: `git fetch origin && git rebase origin/main`.
- **Clean up last N commits**: `git rebase -i HEAD~N` — then mark lines
  `pick` / `reword` / `squash` (keep, fold-with-message) / `fixup` (fold, drop
  message) / `drop` / reorder by moving lines.
- **Autosquash**: commit fixes with `git commit --fixup <sha>`, then
  `git rebase -i --autosquash <base>` to fold them automatically.

## Resolving conflicts

1. `git status` shows conflicted files; open each, resolve the `<<<<<<<` blocks,
   keeping **both sides' intent** (don't blindly take one).
2. `git add <file>` for each resolved file (no commit needed mid-rebase).
3. `git rebase --continue`. Repeat per stopped commit.
4. Stuck? `git rebase --abort` returns you to the exact pre-rebase state.
5. After finishing, the branch diverged from its remote → push with
   **`git push --force-with-lease`** (safer than `--force`: refuses if the
   remote moved unexpectedly).

## Principles

- Small, logically-scoped commits rebase and review far more easily.
- Resolve conflicts by understanding the change, not by picking a side to silence
  the marker.
- `--force-with-lease`, never bare `--force`, on a shared remote.

## Recovery cheatsheet

```
git rebase --abort         # bail out mid-rebase, restore original
git reflog                 # find the pre-rebase commit
git reset --hard HEAD@{n}  # jump back to it
```
