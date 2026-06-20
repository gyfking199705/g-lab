---
name: readme-author
description: Write or improve a project README that gets a new user from zero to running fast. Use when a repo has no README, has a stale or thin one, or when documenting what a project does, how to install it, and how to use it.
license: MIT
allowed-tools: Read, Grep, Glob
metadata:
  category: Docs & Release
  version: 1.0.0
  author: g-lab/skill-lab
  tags: [readme, documentation, onboarding, open-source]
---

# README Author

A README's job: in under a minute, tell a stranger what this is, whether it's
for them, and how to run it.

## When to use

- A repository has no README or a one-line stub.
- The README is out of date with the actual setup/usage.
- Documenting a new project or subproject.

## Research before writing

1. Detect the stack from manifests (`package.json`, `pyproject.toml`, `Cargo.toml`).
2. Find the real entry point, build, run, and test commands — don't invent them.
3. Note the license, and any existing CONTRIBUTING or docs to link rather than duplicate.

## Recommended structure

```markdown
# Project Name
> One-sentence description of what it does and who it's for.

[badges: build · version · license]

## Features
- The 3–6 things that make it worth using.

## Quick start
\`\`\`bash
# install
# run
\`\`\`

## Usage
The most common task, shown end-to-end with a real example.

## Configuration
Key options / env vars, in a table.

## Development
How to build, test, and contribute (link CONTRIBUTING.md).

## License
```

## Guidelines

- **Lead with value**, not history: the first paragraph sells the project.
- Show a **copy-pasteable** quick start that actually works from a clean clone.
- Prefer one real, runnable example over abstract prose.
- Keep it scannable: short sections, headers, code blocks, a table for options.
- Link deeper docs instead of inlining everything; keep the README skimmable.
- State requirements (runtime versions) explicitly so setup doesn't fail silently.

## Smell test

If a newcomer can't install and run a "hello world" from the README alone in a
couple of minutes, it isn't done.
