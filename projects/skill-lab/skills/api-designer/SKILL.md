---
name: api-designer
description: Design clean, consistent, and evolvable HTTP/REST APIs — resources, methods, status codes, errors, pagination, and versioning. Use when adding an endpoint, designing a new service interface, or reviewing an API for consistency and backward compatibility.
license: MIT
allowed-tools: Read, Grep
metadata:
  category: Architecture & API
  version: 1.0.0
  author: g-lab/skill-lab
  tags: [api, rest, http, design, backend]
---

# API Designer

Design APIs that are predictable, hard to misuse, and safe to evolve.

## When to use

- Adding or changing an HTTP endpoint.
- Designing a service's public interface.
- Reviewing an API for consistency or breaking changes.

## Resources & methods

- Model **nouns (resources)**, not verbs: `/orders/{id}/items`, not `/getOrderItems`.
- Use HTTP methods for intent: `GET` (read, safe), `POST` (create), `PUT`
  (replace), `PATCH` (partial update), `DELETE`. `GET` must never mutate.
- Keep `GET`/`PUT`/`DELETE` **idempotent**; make unsafe retries safe with an
  idempotency key where needed.
- Be consistent: plural collections, lowercase-kebab paths, stable id scheme.

## Status codes (use the specific one)

- `200` ok · `201` created (+ `Location`) · `204` no content.
- `400` malformed · `401` unauthenticated · `403` forbidden · `404` not found ·
  `409` conflict · `422` validation failed · `429` rate-limited.
- `500` server error (never leak internals) · `503` unavailable.

## Errors (one consistent shape)

```json
{
  "error": {
    "code": "validation_failed",
    "message": "email is required",
    "details": [{ "field": "email", "issue": "required" }]
  }
}
```

- Machine-readable `code` + human `message`. Same envelope everywhere.

## Collections

- **Pagination** by cursor (stable under writes) over offset for large sets;
  return `next_cursor`. Document default and max page size.
- Support `filter`, `sort`, and `fields` (sparse fieldsets) consistently.

## Evolvability

- **Additive changes are safe** (new optional field/endpoint). Removing or
  renaming a field, changing a type, or tightening validation is **breaking** —
  version it (`/v2`, or media-type/version header) and deprecate with a sunset.
- Never repurpose an existing field's meaning.
- Be conservative in what you send, liberal in what you accept; ignore unknown
  request fields rather than erroring.

## Cross-cutting

- AuthN/Z on every endpoint; rate limits; request size limits.
- Validate all input at the boundary; return `422` with field-level details.
- Document with OpenAPI; the schema is the contract.
