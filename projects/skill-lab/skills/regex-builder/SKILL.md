---
name: regex-builder
description: Build, explain, and debug regular expressions that are correct, readable, and safe from catastrophic backtracking. Use when writing a regex, deciphering an existing one, or fixing a pattern that is wrong, slow, or hangs on certain input.
license: MIT
allowed-tools: Read
metadata:
  category: Utilities
  version: 1.0.0
  author: g-lab/skill-lab
  tags: [regex, regular-expressions, parsing, text-processing]
---

# Regex Builder

Write regexes that match exactly what you mean, read clearly, and don't blow up
on adversarial input.

## When to use

- Crafting a pattern to match/extract/validate text.
- Understanding or fixing an existing regex.
- A regex that's wrong, too greedy, or hangs (ReDoS).

## Method

1. **Write 5–8 concrete cases first**: strings that must match and must *not*
   match, including the tricky edges. Design the pattern to satisfy all of them.
2. **Build incrementally** — anchor and grow piece by piece, testing each step.
3. **Anchor intent**: `^…$` for full-string validation; `\b` for word boundaries.
   An unanchored pattern matches *anywhere*, which is often a bug.
4. **Prefer specific classes** over `.`: `[0-9]`/`\d`, `[^/]`, `[\w.-]`. `.*` is
   the usual culprit behind wrong and slow matches.
5. **Verify** against the full case list, then add 2 nastier inputs.

## Readability

- Use **verbose/extended mode** (`(?x)` / `re.VERBOSE`) with comments for any
  non-trivial pattern.
- Name captures: `(?<year>\d{4})` beats counting `\1 \2 \3`.
- Use **non-capturing groups** `(?:…)` when you don't need the capture.

## Safety — avoid catastrophic backtracking (ReDoS)

- Danger sign: **nested/adjacent quantifiers on overlapping classes**, e.g.
  `(a+)+`, `(\w+\s?)*`, `(.*),(.*)` on long input → exponential time.
- Fix by making subpatterns **mutually exclusive** (`[^"]*` instead of `.*`
  inside quotes), using anchors, possessive quantifiers/atomic groups
  `(?>…)` where supported, or bounded repetition `{0,40}`.
- Never run a complex regex on **untrusted input** without bounding length and
  testing worst-case patterns.

## Know the limits

- Regex can't reliably parse **nested/recursive** structures (HTML, JSON,
  balanced brackets) — use a real parser.
- Dialects differ (PCRE vs JS vs POSIX vs RE2); confirm features like
  lookbehind/named groups exist in your engine. RE2/Go has no catastrophic
  backtracking but drops backreferences.

## Example (extract key=value, safely)

```
^(?<key>[A-Za-z_][\w.-]*)=(?<value>[^\n]*)$
```

Anchored, specific classes, no overlapping quantifiers, named captures.
