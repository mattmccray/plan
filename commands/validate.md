---
description: Drift check — reconcile the plan's checkboxes against real change state
---

Validate the **Plan** against reality. Follow the **validate** procedure in the
`plan` skill. Report mismatches; fix only what the user approves. Check:

- every `Carried by: <name>` resolves to a real change (active or archived);
- every `[x]` phase's change is archived (not still active);
- every archived change is reflected by a done (`[x]`) phase (no silent drift);
- sources-of-truth links resolve.

## Drift report

`plan-state --validate` reconciles the plan's checkboxes/lifecycle against real
engine state and lists every mismatch (`drift:` lines); it exits nonzero when
drift exists. Report those lines; fix only what the user approves. If it's blank
or errors, fall back to reading `PLAN.md` + `openspec list --json` yourself and
run the four checks above by hand (see the skill's degradation rule).

!`node "${CLAUDE_PLUGIN_ROOT}/skills/plan/bin/plan-state.mjs" --validate 2>/dev/null || echo "(plan-state unavailable — read PLAN.md + 'openspec list --json' directly)"`
