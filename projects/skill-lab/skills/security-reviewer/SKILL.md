---
name: security-reviewer
description: Audit code or a diff for security vulnerabilities — injection, broken auth, secrets, and unsafe data handling — and report exploitable findings with fixes. Use when reviewing changes for security, hardening an endpoint, or checking untrusted-input handling before shipping.
license: MIT
allowed-tools: Read, Grep, Bash(git diff:*)
metadata:
  category: Security
  version: 1.0.0
  author: g-lab/skill-lab
  tags: [security, vulnerabilities, owasp, appsec, audit]
---

# Security Reviewer

Look for ways an attacker turns input into impact. Report only **plausible,
exploitable** issues with a concrete fix — not theoretical lint.

## When to use

- Security pass on a PR or module.
- Hardening anything that handles untrusted input, auth, or secrets.
- Before exposing a new endpoint or integration.

## Where bugs hide (trace untrusted input to a sink)

- **Injection** — SQL/NoSQL, OS command, LDAP, template, header, log injection.
  Look for string-built queries/commands; require parameterization/escaping.
- **AuthN / AuthZ** — missing or wrong access checks, IDOR (object id straight
  from the request), privilege escalation, tokens that don't expire/rotate.
- **Secrets** — keys, passwords, tokens hard-coded or logged; secrets in client
  bundles; `.env` committed.
- **Input validation** — path traversal (`../`), SSRF (server fetches a
  user-controlled URL), unsafe deserialization, unbounded input (DoS).
- **Output handling** — XSS (unescaped HTML), open redirects, leaking stack
  traces / internal details in errors.
- **Crypto & transport** — weak/again home-rolled crypto, missing TLS,
  predictable randomness for security tokens, plaintext storage.
- **Dependencies & config** — known-vulnerable packages, debug mode in prod,
  permissive CORS, default credentials.

## How to report

For each finding:

```
[severity] file:line — vulnerability class
  Attack: how it's exploited (the untrusted path → sink).
  Fix: the concrete remediation.
```

- **severity**: `critical` · `high` · `medium` · `low`, judged by exploitability
  and impact.
- Show the data flow: *source* (where attacker input enters) → *sink* (where it
  causes harm). If you can't trace a real path, mark it a question, not a finding.
- Prefer framework-native, parameterized, allow-list fixes over manual escaping.

## Principles

- **Never trust input** — validate type, length, format, and range at the boundary.
- **Least privilege** and **fail closed** (deny by default).
- Don't report style as security; don't bury a `critical` among nits.
- This skill is for **defensive review** of code you're authorized to assess.
