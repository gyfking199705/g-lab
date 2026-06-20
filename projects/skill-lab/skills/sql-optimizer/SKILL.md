---
name: sql-optimizer
description: Diagnose and speed up slow SQL queries using the execution plan, indexing, and query rewrites. Use when a query or report is slow, a database is under load, or you need to add the right index without guessing.
license: MIT
allowed-tools: Read, Bash
metadata:
  category: Data & Databases
  version: 1.0.0
  author: g-lab/skill-lab
  tags: [sql, database, performance, indexing, query-optimization]
---

# SQL Optimizer

Make slow queries fast with evidence from the planner — not by sprinkling
indexes and hoping.

## When to use

- A query, endpoint, or report is slow.
- The DB is CPU/IO-bound and you need to find the offending query.
- Deciding which index to add (or why one isn't used).

## Workflow

1. **Measure first.** Get the real query and its `EXPLAIN ANALYZE` plan (Postgres)
   / `EXPLAIN` (MySQL). Optimize the actual slow query, found via `pg_stat_statements`
   / the slow query log — not the one you assume is slow.
2. **Read the plan bottom-up.** Find the costly node: a `Seq Scan` on a big table,
   a `Nested Loop` over many rows, a big `Sort`/`Hash`, and rows **estimated vs
   actual** far apart (stale statistics → `ANALYZE`).
3. **Fix the access path.** Add an index that covers the `WHERE`/`JOIN`/`ORDER BY`
   columns; verify the plan now uses it.
4. **Re-measure.** Confirm the plan changed and latency dropped on realistic data.

## Indexing rules

- Index columns used in `WHERE`, `JOIN`, and `ORDER BY`.
- **Composite index column order matters**: equality columns first, then range,
  then sort. `(tenant_id, created_at)` serves `WHERE tenant_id=? ORDER BY created_at`.
- **Covering index** (include selected columns) lets an index-only scan skip the
  table.
- Index **selective** columns; a low-cardinality flag rarely helps.
- Indexes cost on write and storage — add deliberately, drop unused ones.

## Query rewrites

- Avoid functions on indexed columns in `WHERE` (`WHERE date(ts)=…` kills the
  index) — use a range or an expression index.
- Replace `SELECT *` with needed columns; enables index-only scans, cuts IO.
- Prefer `EXISTS`/joins over correlated subqueries; beware `OR` across columns.
- Fix **N+1**: batch with one `IN (...)` / join instead of a query per row.
- Use `LIMIT` + keyset (cursor) pagination instead of large `OFFSET`.
- Filter early, aggregate late; only `DISTINCT`/`GROUP BY` when truly needed.

## Don't

- Don't add indexes without confirming the planner uses them and latency improves.
- Don't optimize on a tiny dev dataset — plans flip at production scale.
- Don't trade correctness for speed (silently changing result sets).
