---
description: Discuss a program, then scaffold a fresh PLAN.md (guards an incomplete active plan first)
argument-hint: "[program name]"
---

Start a new **Plan** for program: $ARGUMENTS

Follow the **new** procedure in the `plan-workflow` skill. In short:

1. **Guard the active plan.** If a `PLAN.md` already exists with unfinished
   phases, STOP and confirm: archive-and-carry-forward, archive-and-drop, or
   cancel. If it exists and is complete, archive it first.
2. **Discuss** the program goal, scope, sources of truth, and sequencing strategy
   before writing anything.
3. **Draft coarse phases** (goal + acceptance + dependency order — no granular
   task lists; those belong to the carrying changes).
4. **Write `PLAN.md`** from the template at
   `${CLAUDE_PLUGIN_ROOT}/templates/PLAN.md`, with the header stamped (Status:
   active, Engine, Started date, sources of truth) and every carrying change
   marked "not yet proposed".

Current working-directory state:

!`test -f PLAN.md && echo "An active PLAN.md exists — guard it before creating a new one:" && head -6 PLAN.md || echo "No active PLAN.md — clear to create one."`
