---
name: plan
description: The program/epic layer above a change-management workflow (OpenSpec by default). Use whenever the user works with a PLAN.md or talks about plans, phases, or the roadmap — starting/creating a new plan ("let's start a new plan"), checking plan status ("where are we?"), deciding what to build next ("what's next?"), advancing/landing a phase, archiving a completed plan, or validating that the plan matches reality. Carries the ubiquitous language (Plan → Phases → carried by → Changes), the discipline rules (R1–R7), the artifact shape, and the plan lifecycle. The `plan:*` commands delegate here.
---

# Plan — workflow

You are operating the **Plan** layer: a coarse, resumable roadmap (`PLAN.md`) that
sequences **Phases**, each **carried by** one or more **Changes**. Plan sits
*above* the change engine (OpenSpec by default); it never duplicates a change's
granular tasks. This file is the complete operational guide — everything you need
to run the workflow is here. (When installed as the Plan plugin, `DESIGN.md` in the
plugin repo holds the full rationale; it's optional background, not required to run.)

## Vocabulary (use exactly)

- **Plan** — the roadmap (`PLAN.md`); one active plan per program.
- **Phase** — a coarse, sequenced chunk: goal + deliverables + acceptance + status.
- **Change** — a unit of work that **carries** a phase's tasks (an OpenSpec change
  by default). Keep OpenSpec's word: *propose / apply / archive* a **change**.
- **Invariants** — the cross-cutting definition-of-done across every phase.
- **Divergence** — a recorded, signed-off deviation from a source of truth.

Linking verb: **carry** — "a phase is carried by changes."

## The discipline rules (enforce these)

- **R1 Coarse, never duplicated** — granular tasks live only in the carrying
  change. The plan states goal/deliverables(coarse)/acceptance/status. Never copy
  a task list into the plan.
- **R2 Point, don't restate** — link sources of truth; never re-explain them.
- **R3 Every phase maps to changes** — name the change(s), each with a lifecycle
  state: *not yet proposed → proposed → applied → archived.*
- **R4 Status reflects reality** — keep checkboxes/status current so the plan is
  resumable.
- **R5 Divergences recorded, never silent** — write deviations inline, with
  rationale + sign-off.
- **R6 Invariants are a DoD overlay** — a phase that breaks one is not done.
- **R7 Plans are kept** — archive completed plans, never delete.

## The engine seam

The plan's header declares its change engine (`Engine: OpenSpec`). Drive whatever
is declared; **default to OpenSpec** (`openspec/changes/`, the `opsx:*`
commands). To carry a phase, propose / apply / archive a change via that engine —
this is what the **next** driver does. Never hard-assume OpenSpec is the only
option, but do default to it.

**Engine handoffs run in a subagent by default.** When the driver invokes an
`opsx:*` command, dispatch it to a subagent seeded with the change name + context
(phase goal, acceptance bar, sources of truth, the change notes from `PLAN.md`).
The subagent returns a concise summary + resulting state; record that back into
`PLAN.md`. This keeps the driver session light and lets `next` run from another
agent.

## Locating things

- Active plan: `PLAN.md` at the repo root (the one well-known location).
- Archived plans: `plans/archive/YYYY-MM-DD-<program>.md`.
- The PLAN.md template ships **alongside this skill** at `templates/PLAN.md`
  (relative to this SKILL.md). When installed as the Plan plugin, the same file is
  at `${CLAUDE_PLUGIN_ROOT}/skills/plan/templates/PLAN.md`.
- Change state (OpenSpec): `openspec list --json`, and the
  `openspec/changes/` + `openspec/changes/archive/` directories.

### The state script (read-only digest)

A zero-dependency Node script does the deterministic read+classify for you so you
don't re-derive it from raw files each time. It ships alongside this skill at
`bin/plan-state.mjs` (as the plugin: `${CLAUDE_PLUGIN_ROOT}/skills/plan/bin/plan-state.mjs`).
Run it from the repo root — it works on any agent with a shell, on macOS/Linux/Windows:

```
node <skill-dir>/bin/plan-state.mjs            # the digest
node <skill-dir>/bin/plan-state.mjs --validate  # drift-focused; exits nonzero on drift
```

It **only reads** — it parses `PLAN.md`, joins it against the declared engine's
ground truth, and prints a compact digest. It never edits anything; you still own
every transition and write. The digest shape:

```
PLAN: <program> · status: active · engine: OpenSpec
phase → Phase 2 of 5 "Wire the driver" [~]
phases:
  [x] 0 Foundations      scaffold-core — archived
  [~] 2 Wire the driver  driver-loop — proposed (3/8)
  [ ] 3 Validate path    validate-cli — not yet proposed
next: apply driver-loop  (mode: confirm)
drift: none
```

Read the `phase →`, per-change lifecycle states, and the `next:` recommendation;
that is the computed state you'd otherwise derive by hand. **Degrade gracefully:**
if the script is missing, Node is unavailable, or the output is blank/garbled,
fall back to reading `PLAN.md` + `openspec list --json` directly and classify by
hand (present with work pending ⇒ *proposed*; `status: complete` ⇒ *applied*;
absent ⇒ *archived*). The digest is advisory ground-truthing, never a hard gate.

---

## Procedures

Five procedures, invoked five ways — all equivalent. However the user reached you
— a Claude Code plugin command (`/plan:next`), a bare verb (`plan next`, or just
`next` once this skill is active), or natural language — map the intent to the
matching procedure below and run it:

| Verb | Invocations that dispatch here | Natural-language triggers |
| --- | --- | --- |
| **create** | `/plan:create`, `plan create`, `plan new` | "let's start a new plan", "new program" |
| **status** | `/plan:status`, `plan status` | "where are we?", "plan status" |
| **next** | `/plan:next`, `plan next` | "what's next?" (to drive), "land/advance this phase", "do the next thing" |
| **archive** | `/plan:archive`, `plan archive` | "finalize the plan", "the plan's done" |
| **validate** | `/plan:validate`, `plan validate` | "does the plan match reality?", "check for drift" |

Only Claude Code (as the Plan **plugin**) exposes these as real `/plan:*` slash
commands. Installed as a skill on any other agent, there are no slash commands —
you're activated by the triggers above, then dispatch here just the same. "what's
next?" reports via **status**; "advance/land it" drives via **next**.

**First, establish current state.** Before running any procedure, get the ground
truth so you're never reasoning about a stale plan. The fastest path is the state
script (see **The state script** above): `node <skill-dir>/bin/plan-state.mjs`
prints the digest — current phase, per-change lifecycle states, the recommended
next action, and drift — computed from:

1. `PLAN.md` at the repo root (its presence/absence and contents), and
2. the change engine's state — for OpenSpec, `openspec list --json` (each active
   change's `status` + `completedTasks`/`totalTasks`).

(As the Plan plugin the digest is pre-loaded into the command's context; as a
bare skill, run the script yourself first. If the script is unavailable, read the
two sources directly — same state either way.)

### create — start a new plan

1. **Guard the active plan.** If `PLAN.md` exists and has unfinished phases
   (`[ ]`/`[~]`), STOP and confirm intent. Offer:
   - (a) archive it as-is and **carry unfinished phases forward** into the new plan,
   - (b) archive it as-is and drop the unfinished work,
   - (c) cancel — they meant to keep working the current plan.
   If `PLAN.md` exists and is complete, archive it first (see **archive**).
2. **Discuss** (conversational, like exploring at plan altitude): the program's
   goal and scope, the sources of truth, and the sequencing strategy. Do not rush
   to write the file.
3. **Draft coarse phases** — each with a goal, an acceptance bar, and dependency
   order. Coarse only (R1): no granular task lists.
4. **Write `PLAN.md`** from the template bundled with this skill at
   `templates/PLAN.md` (as the plugin: `${CLAUDE_PLUGIN_ROOT}/skills/plan/templates/PLAN.md`): fill the
   header (Program, Status: active, Engine, Started date, Sources of truth), list
   the phases, and mark every carrying change **not yet proposed**. State the
   cross-cutting invariants and the out-of-scope list.

### status — where are we

1. Read `PLAN.md`. Read change state via `openspec list --json` (or the declared
   engine's equivalent).
2. Report: current phase, each phase's state, the lifecycle state of each carrying
   change, and **what's next**. Surface any drift you notice (see **validate**),
   but don't fix it unasked.

### next — the driver (carry the plan to its next state)

`next` is the workhorse: read where things stand, then perform the single next
transition — propose/apply/archive the right change, close a finished phase, or
advance to the next. It absorbs the old separate "advance/land" verb. It is
**stateful and resumable**: derive everything from `PLAN.md` + the engine, so it
runs across sessions and from subagents.

1. **Locate** the active `PLAN.md`. If none exists, say so and offer **create**;
   stop.
2. **Read state — the script does this for you.** Run
   `node <skill-dir>/bin/plan-state.mjs` (or read the digest the command
   pre-loaded). It has already parsed `PLAN.md`, joined it against the engine, and
   classified each change (*proposed / applied / archived / not yet proposed*),
   found the current position, and printed the recommended `next:` action + mode.
   If the script is unavailable, classify by hand from `openspec list --json`
   (present with work pending ⇒ proposed; `status: complete` ⇒ applied; absent ⇒
   archived; per-change detail via `openspec status --change <id> --json`).
3. **Lightly reconcile** any `drift:` the digest reports (e.g. the engine reports a
   change archived but the plan still says `applied` — fix the plan). Leave deep
   reconciliation to **validate**.
4. **Take the position from the digest** — its `phase →` line is the first phase
   not done, and within it the first carrying change not yet `archived`. (By hand:
   same rule, respecting dependency order.)
5. **Perform the next transition** — the digest's `next:` line names it — **always showing the action +
   the command you'll run, and confirming before real work or any decision:**

   | Change state | Transition | Mode |
   | --- | --- | --- |
   | not yet proposed | offer **propose** vs **explore**; dispatch the chosen `opsx:*` to a subagent | **confirm** (decision; starts work) |
   | proposed | **apply** — dispatch `opsx:apply` to a subagent | **confirm** (real work) |
   | applied (engine reports complete) | **archive** — dispatch `opsx:archive` | auto-chain (mechanical cleanup) |
   | archived, more changes in phase | advance to the next change → propose… | auto-chain, then stop at the propose decision |
   | archived, last change in phase | **close the phase**: flip `[x]`, stamp **Status** with date + one-line outcome | auto-chain |
   | all phases `[x]` | suggest **archive** (the plan) | **confirm** |

   Before closing a phase, confirm acceptance is met and invariants (R6) still
   hold. Record any **divergence** (R5) surfaced while landing.
6. **Loop until it needs you.** Keep performing auto-chain bookkeeping transitions
   (archive a completed change, close a phase, advance to the next), but **stop
   and confirm** at the next propose/apply decision or whenever input is needed.
7. **Persist after each transition.** Update the change's lifecycle state,
   checkbox, and **Status** line in `PLAN.md` so the plan stays the resumable
   source of truth.

Dispatch every engine handoff to a subagent by default (see **The engine seam**).

### archive — finalize a completed plan

1. Verify the plan is complete (all phases `[x]`, or the user has explicitly
   accepted remaining work as out-of-scope).
2. In `PLAN.md`, set **Status: complete** and stamp the **Completed** date.
3. Move it to `plans/archive/YYYY-MM-DD-<program>.md` (creating `plans/archive/`
   if needed). The date is the completion date; the suffix is the program
   identity (e.g. `2026-06-11-minerva-v3.md`).
4. Offer to chain into **create** for the next program.

### validate — drift check (R3/R4)

Reconcile the plan against real change state and report mismatches; fix only what
the user approves. Run `node <skill-dir>/bin/plan-state.mjs --validate` — it emits
the mismatches as `drift:` lines and exits nonzero when any exist, checking:
- every `Carried by: <name>` resolves to a real change (active or archived);
- every `[x]` phase's change is archived (not still active);
- every declared lifecycle state matches the engine's;
- a done phase's change isn't still active, and an archived change's phase isn't
  still open.

Report those lines and fix only what the user approves. If the script is
unavailable, run the same checks by hand against `PLAN.md` + `openspec list
--json`. Sources-of-truth links are a human judgment — eyeball the header's
`Sources` line resolves.

## Guardrails

- Don't violate R1: if you're tempted to paste a task list into the plan, that's
  the change's job — link it instead.
- Don't silently update status that isn't real (R4) or hide a deviation (R5).
- Keep plans prose. Don't impose a rigid schema or frontmatter.
- One active plan. Don't create a second `PLAN.md` without archiving the first.
