---
name: accessibility-auditor
description: Audit web UI for accessibility (WCAG) issues — semantics, keyboard, focus, contrast, labels, and ARIA — and return prioritized fixes. Use when reviewing a component or page for a11y, making a UI usable with a keyboard or screen reader, or meeting WCAG AA.
license: MIT
allowed-tools: Read, Grep
metadata:
  category: Frontend
  version: 1.0.0
  author: g-lab/skill-lab
  tags: [accessibility, a11y, wcag, frontend, aria]
---

# Accessibility Auditor

Make the UI usable by everyone — keyboard-only, screen reader, low vision — and
report concrete WCAG-aligned fixes.

## When to use

- Reviewing a component/page for accessibility.
- Making something keyboard- and screen-reader-usable.
- Targeting WCAG 2.1 AA.

## Check, in priority order

1. **Semantics first.** Use the right native element: `<button>` for actions,
   `<a href>` for navigation, `<label>` for inputs, headings in order (`h1→h2`),
   lists for lists. Native semantics beat ARIA. A `<div onclick>` is a bug.
2. **Keyboard.** Everything interactive is reachable and operable with Tab/Enter/
   Space/Esc/arrows; focus order is logical; **no keyboard traps**; custom
   widgets follow the WAI-ARIA Authoring Practices pattern.
3. **Visible focus.** A clear focus indicator on every focusable element; never
   `outline: none` without a replacement.
4. **Names & roles.** Every control has an accessible name (label, `aria-label`,
   or `aria-labelledby`). Icon-only buttons need a name. Images need `alt`
   (empty `alt=""` for decorative).
5. **Forms.** Labels tied to inputs; errors announced and associated
   (`aria-describedby`, `aria-invalid`); don't rely on color alone for errors.
6. **Contrast.** Text ≥ **4.5:1** (3:1 for large text); UI/icon boundaries ≥ 3:1.
7. **Dynamic content.** Announce async updates with `aria-live`; manage focus on
   route change, modal open (trap + restore focus), and after deletions.
8. **Don't break zoom / reflow**; respect `prefers-reduced-motion`.

## ARIA rules

- **No ARIA is better than bad ARIA.** Prefer native elements.
- Don't override native semantics (`role="button"` on a `<button>`), and ensure
  any ARIA state (`aria-expanded`, `aria-checked`) is kept in sync with JS.

## How to report

```
[severity] selector/component — WCAG criterion — problem → fix
```

- **severity**: `blocker` (unusable for some users) · `serious` · `minor`.
- Give the concrete fix (the element/attribute to change), not just the rule id.

## Quick smell test

Unplug the mouse: can you reach and operate everything, and always see where
focus is? If not, start there.
