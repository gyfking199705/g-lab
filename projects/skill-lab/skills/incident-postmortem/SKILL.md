---
name: incident-postmortem
description: Write a blameless postmortem after an incident — timeline, root cause, impact, and concrete action items. Use when documenting an outage or production incident, running a retro, or turning a failure into durable fixes and prevention.
license: MIT
allowed-tools: Read, Bash(git log:*)
metadata:
  category: Reliability
  version: 1.0.0
  author: g-lab/skill-lab
  tags: [postmortem, incident, sre, reliability, retrospective]
---

# Incident Postmortem

Turn an incident into learning and durable fixes — focus on systems, not blame.

## When to use

- After a production outage or significant incident.
- Running an incident retrospective.
- Converting a near-miss into preventive action.

## Blameless stance

People act reasonably given what they knew at the time. Ask **what about the
system** let this happen (missing guardrail, unclear signal, gap in tooling) —
not *who* erred. Blame hides the truth and kills future honesty.

## Structure

```markdown
# Postmortem: <short title> — <date>

## Summary
2–3 sentences: what broke, impact, how it was resolved.

## Impact
Who/what was affected, for how long, magnitude (users, requests, revenue, SLO).

## Timeline (with timezone)
- 14:02 — first error spike / alert fired
- 14:09 — on-call engaged
- 14:25 — root cause identified
- 14:40 — fix deployed; recovery confirmed

## Root cause
The actual cause(s) — trace contributing factors, not just the trigger.

## Detection
How we found out, and how long it took. Could monitoring have caught it sooner?

## Resolution & recovery
What stopped the bleeding, and what restored normal service.

## Action items
| Action | Type (prevent/detect/mitigate) | Owner | Due |
| --- | --- | --- | --- |

## Lessons learned
What went well, what went poorly, where we got lucky.
```

## Get root cause right

- Distinguish **trigger** (what set it off) from **root cause** (why it could).
- Ask "why" until you reach a systemic, fixable factor (the 5 Whys), but list
  **multiple contributing factors** — incidents are rarely single-cause.

## Action items that actually help

- **Specific, owned, and dated** — "improve monitoring" is not an action item;
  "add alert on queue depth > 1000, owner @x, by Fri" is.
- Bias toward **prevention and faster detection** over "be more careful".
- Track them to completion; an untracked action item is a future repeat incident.

## Don't

- Don't assign blame to a person or paper over the cause.
- Don't skip the timeline — it's where contributing factors surface.
- Don't let the doc die unread; share it and close the loop on actions.
