---
name: structured-logging
description: Add useful, structured, privacy-safe logging to a service — right levels, machine-parseable context, no secrets. Use when instrumenting code for observability, debugging a production issue, or cleaning up noisy, unstructured print-style logs.
license: MIT
allowed-tools: Read, Grep
metadata:
  category: Observability
  version: 1.0.0
  author: g-lab/skill-lab
  tags: [logging, observability, debugging, monitoring, production]
---

# Structured Logging

Logs should answer "what happened, where, with what context" — for both humans
and machines — without leaking sensitive data.

## When to use

- Instrumenting a service for observability.
- Diagnosing a production issue that needs better traces.
- Replacing scattered `print`/`console.log` with real logging.

## Use structured (key-value / JSON) logs

Emit events with fields, not interpolated prose, so they're queryable:

```json
{"level":"error","msg":"payment failed","order_id":"A123","amount":42.0,
 "provider":"stripe","err":"card_declined","trace_id":"7f3a…","duration_ms":210}
```

Prefer `logger.error("payment failed", {order_id, provider, err})` over
`log("payment failed for " + orderId)`.

## Levels (pick deliberately)

- **error** — something failed and needs attention; include the cause.
- **warn** — unexpected but handled; worth watching.
- **info** — significant business events (request handled, job done).
- **debug** — detailed developer diagnostics, off in prod by default.
- Don't log everything at `error`; don't bury real errors in `info` noise.

## Add context that makes logs useful

- A **correlation/trace id** threaded through a request so you can follow it.
- Stable keys (`user_id`, `order_id`, `route`, `status`, `duration_ms`).
- The **cause** on errors (message + type; stack at debug), not just "failed".
- Timestamps and service/version — usually injected by the logging framework.

## Never log (privacy & security)

- Secrets: passwords, tokens, API keys, full card numbers, auth headers.
- PII beyond what's needed; mask/redact (`****1234`, hash emails) when required.
- Whole request/response bodies by default — they hide secrets and bloat cost.

## Hygiene

- One event = one log line; don't split a single event across many lines.
- Log at the boundary (request in/out, external call result), not every line.
- Make levels configurable; avoid logging inside tight loops (sample instead).
- Logs are append-only telemetry, **not** control flow — don't parse your own
  logs to make decisions.
