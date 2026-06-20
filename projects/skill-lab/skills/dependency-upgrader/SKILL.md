---
name: dependency-upgrader
description: Upgrade project dependencies safely — read changelogs, handle breaking changes, and verify with tests, one logical bump at a time. Use when updating packages, resolving a vulnerability advisory, or unblocking an outdated lockfile without breaking the build.
license: MIT
allowed-tools: Read, Bash(npm:*), Bash(git diff:*), Bash(git log:*)
metadata:
  category: DevOps & Infra
  version: 1.0.0
  author: g-lab/skill-lab
  tags: [dependencies, upgrades, security, maintenance, semver]
---

# Dependency Upgrader

Keep dependencies current without turning an upgrade into an outage.

## When to use

- Routine dependency maintenance.
- Patching a security advisory (CVE / `npm audit`).
- An outdated lockfile is blocking a feature or CI.

## Principles

- **One logical upgrade per commit/PR** — never bump everything at once; when it
  breaks, you must know which package did it.
- **Read the release notes / changelog** for the target version, especially the
  **BREAKING CHANGES** and migration guide. SemVer is a promise, not a guarantee.
- **Tests are the safety net** — don't upgrade what you can't verify. Add a smoke
  test first if coverage is thin.

## Workflow

1. **Triage**: list what's outdated and why (security? blocked feature? routine?).
   Prioritize security and patch/minor bumps; schedule majors deliberately.
2. **Patch & minor first** (should be backward-compatible): bump, run the full
   test suite + build, commit. These are low-risk and clear the noise.
3. **Majors one at a time**: read the migration guide, apply codemods if provided,
   fix call sites, run tests, commit separately with notes on what changed.
4. **Lockfile**: commit the updated lockfile; ensure CI installs from it
   (`npm ci`) for reproducibility.
5. **Verify beyond tests**: build, start the app, exercise the affected path.

## Security upgrades

- Map the advisory to the actual vulnerable package and whether you use the
  affected code path.
- Prefer the **minimal fix** (patched version) over a sweeping major jump.
- If a transitive dep is vulnerable, upgrade the parent or use an override/
  resolution; confirm the fix with the audit tool.

## Guardrails

- Don't blindly run "update all to latest" and commit a green install — green
  install ≠ working app.
- Watch for **peer dependency** conflicts and duplicated versions.
- Note removed/renamed APIs, changed defaults, and Node/engine requirement bumps.
- Keep the diff reviewable: code changes for the migration separate from the
  lockfile churn when practical.
