---
name: changelog-keeper
description: Maintain a human-readable CHANGELOG.md following the Keep a Changelog format and semantic versioning. Use when cutting a release, adding an entry for a merged change, or converting raw commit history into grouped, user-facing release notes.
license: MIT
allowed-tools: Read, Bash(git log:*), Bash(git tag:*)
metadata:
  category: Docs & Release
  version: 1.0.0
  author: g-lab/skill-lab
  tags: [changelog, release-notes, semver, documentation]
---

# Changelog Keeper

Keep a changelog humans actually read: grouped by type, written for users, and
versioned by impact.

## When to use

- Cutting a new release.
- Recording a notable change as it merges.
- Turning `git log` into release notes.

## Format (Keep a Changelog 1.1)

```markdown
# Changelog

All notable changes to this project are documented here.
The format is based on Keep a Changelog, and this project adheres to SemVer.

## [Unreleased]

## [1.4.0] - 2026-06-20
### Added
- New `--watch` flag for the build command.
### Changed
- Default timeout raised from 5s to 30s.
### Fixed
- Crash when the config file was empty.

## [1.3.1] - 2026-05-02
### Security
- Patched a path-traversal issue in the file loader.
```

## Categories (use only those that apply)

`Added` · `Changed` · `Deprecated` · `Removed` · `Fixed` · `Security`.

## Workflow

1. Keep an `## [Unreleased]` section at the top; add entries there as work merges.
2. On release, rename `Unreleased` to the new version with today's date and open
   a fresh empty `Unreleased`.
3. Choose the version by impact (SemVer):
   - **MAJOR** — breaking changes (incompatible API).
   - **MINOR** — backward-compatible features.
   - **PATCH** — backward-compatible bug fixes.
4. Write entries for **users**, not for the codebase: describe the effect, not
   the commit. Prefer "Fixed crash on empty config" over "fix null check".
5. Link versions to compare/diff URLs at the bottom when the host supports it.

## Don't

- Don't dump raw commit subjects — group and rewrite them.
- Don't document internal refactors with no user-visible effect.
- Don't reorder or rewrite already-released sections (history is immutable).
