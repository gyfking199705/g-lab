---
name: unit-test-author
description: Write focused, fast, deterministic unit tests for a function or module, covering happy paths, edge cases, and error handling. Use when adding tests for new code, backfilling coverage for untested logic, or reproducing a bug as a failing test before fixing it.
license: MIT
allowed-tools: Read, Grep, Bash(npm test:*), Bash(node --test:*)
metadata:
  category: Testing
  version: 1.0.0
  author: g-lab/skill-lab
  tags: [testing, unit-tests, tdd, quality, coverage]
---

# Unit Test Author

Write tests that pin behavior precisely, run fast, and fail with a message that
tells you exactly what broke.

## When to use

- New pure logic that lacks tests.
- Backfilling coverage on a risky module.
- Reproducing a reported bug as a failing test (red) before the fix (green).

## Before writing

1. Find the project's test runner and conventions (look for `*.test.*`,
   `__tests__/`, the `test` script in `package.json`).
2. Identify the **unit**: a pure function is ideal. If logic is tangled with
   I/O, test the pure core and inject or mock the boundaries.
3. List behaviors to cover, not lines: each branch, boundary, and error.

## What to cover

- **Happy path** — typical, valid input.
- **Edge cases** — empty, zero, negative, max, unicode, duplicates, boundaries.
- **Error handling** — invalid input throws / returns the documented error.
- **Invariants** — properties that must always hold (idempotence, ordering).

## Structure each test

- One behavior per test; name it as the behavior: `returns 404 for unknown id`.
- Arrange–Act–Assert, with the assertion comparing against an explicit expected
  value (avoid asserting on internals or re-deriving the expected value).
- Keep tests independent and order-free — no shared mutable state.
- Make them deterministic: freeze time, seed randomness, stub the network.

## Example (Node's built-in runner)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from './slug.js';

test('lowercases and hyphenates', () => {
  assert.equal(slugify('Hello World'), 'hello-world');
});

test('strips leading/trailing separators', () => {
  assert.equal(slugify('  --Hi!--  '), 'hi');
});

test('returns empty string for no alphanumerics', () => {
  assert.equal(slugify('!!!'), '');
});
```

## Anti-patterns

- Tests that pass no matter what (asserting `toBeDefined` on everything).
- Over-mocking until the test only verifies the mocks.
- Snapshotting huge blobs nobody reviews.
- One giant test asserting twenty unrelated things.
