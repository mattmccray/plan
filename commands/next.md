---
description: Identify the next phase/deliverable and hand off to the change engine to carry it
---

Determine what to build next. Follow the **next** procedure in the
`plan-workflow` skill: from `PLAN.md`, find the next unstarted deliverable/phase
in dependency order, summarize it and its acceptance bar, then **hand off to the
change engine** (for OpenSpec, propose the change via `opsx:propose`) and record
the change name + `proposed` state on that phase in `PLAN.md`.

## Active plan

!`test -f PLAN.md && cat PLAN.md || echo "No PLAN.md found. Run /plan:new to start one."`
