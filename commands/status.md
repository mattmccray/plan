---
description: Show where the plan stands — current phase, phase states, carrying-change states, and what's next
---

Report **Plan** status. Follow the **status** procedure in the `plan`
skill: read `PLAN.md`, read change state, then report the current phase, each
phase's state, the lifecycle state of each carrying change, and what's next.
Surface any drift you notice but don't fix it unasked.

## Plan state digest

The `plan-state` script parses `PLAN.md` + the engine and prints a compact digest
(current phase, per-phase and per-change states, the recommended next action, and
any drift). Read it and report from it. If it's blank or errors, fall back to
reading `PLAN.md` + `openspec list --json` yourself (see the skill's degradation rule).

!`node "${CLAUDE_PLUGIN_ROOT}/skills/plan/bin/plan-state.mjs" 2>/dev/null || echo "(plan-state unavailable — read PLAN.md + 'openspec list --json' directly)"`
