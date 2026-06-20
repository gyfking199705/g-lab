---
name: refactoring-planner
description: Plan and execute a safe, behavior-preserving refactor in small verified steps backed by tests. Use when restructuring code, paying down technical debt, untangling a large function or module, or preparing messy code before adding a feature.
license: MIT
allowed-tools: Read, Grep, Glob, Bash(npm test:*), Bash(node --test:*)
metadata:
  category: Code Quality
  version: 1.0.0
  author: g-lab/skill-lab
  tags: [refactoring, technical-debt, code-quality, maintainability]
---

# Refactoring Planner

Change the shape of code without changing its behavior — in steps small enough
that each one is obviously safe.

## When to use

- Restructuring code that works but is hard to change.
- Paying down debt before building on top of it.
- Breaking up a god-function/class or duplicated logic.

## The golden rule

**Refactoring preserves behavior.** Don't mix it with feature changes or bug
fixes in the same commit — separate "make the change easy" from "make the easy
change". If there's no test pinning current behavior, **add one first**.

## Plan first

1. **Characterize** current behavior with tests (a safety net). If untested,
   write characterization tests that capture what it does *today*.
2. **Name the target**: what structure do you want and why (smaller units,
   clearer names, removed duplication, decoupled I/O)?
3. **Sequence small steps**, each independently green and committable.

## Safe, named moves (one at a time)

- **Extract function/variable** — name a sub-expression or block.
- **Rename** — make intent obvious (let the IDE/tooling do it).
- **Inline** — remove a needless indirection.
- **Introduce parameter / dependency** — push I/O to the edges; make a pure core.
- **Replace conditional with table/polymorphism** when branches sprawl.
- **De-duplicate** — unify three-strikes duplication into one well-named place.

## Loop

```
pick the smallest improving step
→ make it
→ run the tests (must stay green)
→ commit
→ repeat
```

If a step turns red, **revert it** and take a smaller step. Never refactor on a
red bar.

## Guardrails

- Keep each commit a pure, reversible refactor with a descriptive message.
- Don't gold-plate: stop when the code is clear enough for the task at hand.
- Watch for behavior leaks: order of side effects, error messages, edge cases,
  floating-point/precision, and public API shape must stay identical.
- If you discover a real bug mid-refactor, note it and fix it in a *separate*
  commit.
