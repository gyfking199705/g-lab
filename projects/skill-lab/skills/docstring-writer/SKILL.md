---
name: docstring-writer
description: Write clear API docstrings and code comments that explain intent and contracts, not the obvious. Use when documenting functions, classes, or modules, adding docstrings to public APIs, or improving comments that restate the code instead of explaining why.
license: MIT
allowed-tools: Read, Grep
metadata:
  category: Docs & Release
  version: 1.0.0
  author: g-lab/skill-lab
  tags: [documentation, docstrings, comments, api, readability]
---

# Docstring Writer

Document the contract and the *why*. Code says what it does; comments say what it
can't.

## When to use

- Documenting a public function, class, or module.
- Adding docstrings to an API others will call.
- Replacing comments that just narrate the code.

## Comment the why, not the what

- **Bad** (restates code): `i += 1  // increment i`.
- **Good** (explains intent): `// skip the BOM so the parser sees clean UTF-8`.
- Good comments capture **why**, trade-offs, non-obvious constraints, gotchas,
  and links to the spec/issue. If the code is unclear, prefer *making it clearer*
  over explaining the murk.

## A good docstring states the contract

For a function/method, cover what a caller needs to use it correctly:

- **One-line summary** in the imperative ("Parse a duration string into seconds").
- **Parameters**: meaning, units, accepted range; not just the type.
- **Returns**: what, and in what units/shape.
- **Errors/raises**: what it throws and when.
- **Side effects**: mutation, I/O, globals — anything beyond the return value.
- **Non-obvious behavior**: edge cases, thread-safety, complexity if it matters.
- A short **example** for anything tricky.

## Follow the language's convention

Use the idiomatic format and tooling so docs render and lint:
JSDoc/TSDoc (`@param`, `@returns`, `@throws`), Python PEP 257 + Google/NumPy
style, Javadoc, Go doc comments (full sentences starting with the symbol name),
Rust `///` with `# Examples`.

## Example (TSDoc)

```ts
/**
 * Parse a human duration ("1h30m") into seconds.
 * @param input - duration like "90m", "1h30m", "45s"; whitespace ignored.
 * @returns total seconds as a non-negative integer.
 * @throws RangeError if the format is invalid or a unit is unknown.
 */
function parseDuration(input: string): number
```

## Guidelines

- Document **public** surfaces thoroughly; keep private helpers light.
- Keep docs next to code and **update them with the code** — a stale docstring is
  worse than none.
- Don't document the obvious or auto-generate filler (`@param x the x`).
- Prefer precise verbs and concrete units over vague prose.
