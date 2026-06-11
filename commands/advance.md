---
description: Mark a deliverable/phase done — flip the checkbox, stamp status + date, reconcile
argument-hint: "[phase or deliverable]"
---

Advance the plan: $ARGUMENTS

Follow the **advance** procedure in the `plan-workflow` skill:

1. Confirm the work actually landed (carrying change applied/archived, tests
   green, acceptance met, invariants still hold).
2. Update `PLAN.md`: flip the checkbox(es) to `[x]`, update the phase **Status**
   with a date and a one-line outcome, set the carrying change's lifecycle state.
3. Record any **divergence** discovered while landing (never silent).

## Active plan

!`test -f PLAN.md && cat PLAN.md || echo "No PLAN.md found. Run /plan:new to start one."`
