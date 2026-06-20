---
name: debugging-strategy
description: Debug a failing program systematically by reproducing, isolating, and confirming the root cause before changing code. Use when chasing a bug, an intermittent failure, or unexpected behavior — to avoid guess-and-check edits and shotgun fixes.
license: MIT
allowed-tools: Read, Grep, Bash
metadata:
  category: Debugging
  version: 1.0.0
  author: g-lab/skill-lab
  tags: [debugging, root-cause, troubleshooting, scientific-method]
---

# Debugging Strategy

Find the *root cause* with a tight loop of hypothesis and evidence, instead of
mutating code until symptoms disappear.

## When to use

- A test, build, or runtime behavior is failing or wrong.
- An intermittent / "works on my machine" bug.
- Before you're tempted to add `try/catch` or a sleep to "make it pass".

## The loop

1. **Reproduce reliably.** Find the smallest, deterministic way to trigger it.
   No reliable repro → that's the first problem to solve (seed RNG, pin time,
   control inputs). A bug you can't reproduce, you can't confirm fixed.
2. **Read the actual error.** The full stack trace and message, top frame first.
   Don't skim — the answer is often literally printed.
3. **Form one hypothesis.** A specific, falsifiable statement: "X is null because
   Y returns early when Z."
4. **Bisect to localize.** Narrow *where* with binary search: git bisect across
   commits, comment out halves, add logs at midpoints. Halve the search space
   each step.
5. **Confirm before fixing.** Prove the cause with evidence (a log, a value, a
   failing assertion). Only then change code.
6. **Fix the cause, not the symptom.** Then verify the original repro passes and
   add a regression test so it can't come back.

## Tactics

- **Print the truth, not your assumptions** — log the actual value, type, and
  shape; don't assume what a variable holds.
- **Rubber-duck**: explain the flow line by line; the wrong assumption surfaces.
- **Change one thing at a time** — multiple simultaneous edits hide which fixed it.
- **Check the boundaries**: recent changes (`git log`/`git diff`), environment,
  versions, config, and the data — not just the code.
- **Question the premise**: is the test correct? is the "expected" value right?

## Red flags you're guessing

- Adding `sleep`/retries to fix a race without knowing what races.
- Catching and swallowing an exception instead of understanding it.
- "It passed when I changed this, not sure why." → you haven't found the cause.
