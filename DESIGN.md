# Plan — design & ratified model

This is the source-of-truth spec for the **Plan** plugin: the vocabulary, the
discipline rules, the artifact shape, and the lifecycle. The `skills/` and
`commands/` implement what is ratified here; when they disagree with this doc,
fix one — don't let them drift.

## What Plan is

Plan is the **program / epic layer** that sits *above* a change-management
workflow. Tools like OpenSpec take a single unit of work from proposal →
implementation → archive, but have **no native concept of a program**: a phased
roadmap spanning many changes. Plan fills exactly that gap with one coarse,
resumable, human-readable document — `PLAN.md` — that sequences **Phases**, each
**carried by** one or more changes.

```
   PLAN.md ............ the roadmap: Phases, sequenced, each carried by Changes
      │ carried by
      ▼
   openspec/changes/ .. Changes (propose → apply → archive) — the work engine
```

Plan is deliberately **coarse**. It is a spine, not a task tracker: the granular
tasks live *only* in the change that carries a phase. Plan points at them; it
never restates them. That separation is the whole point — the two never drift
because there is only one copy of each fact.

## Lineage (why this exists)

Plan is the last extraction from a retired monolith. An earlier tool ("brain")
bundled milestones + stages + issue-tracking + memory + a dispatcher into one
`_brain/` system. As composable, single-purpose tools matured, the bundle came
apart:

```
   brain capability              →  composable home          status
   ───────────────────────────      ──────────────────────   ──────
   stage research/implement/done    OpenSpec change lifecycle  absorbed
   issue inbox                       a standalone issues tool   extracted
   milestone / epic layer            Plan (this plugin)         extracted  ← here
   durable project memory            (a future extraction)      deferred
   dispatcher (_brain/ router)       — not needed —             obsolete
```

The load-bearing lesson: **the document is the state.** brain kept state in a
central `_brain/` store; Plan keeps its state *inside the artifact it describes*
(checkboxes and status lines in `PLAN.md`). No central store, no dispatcher. Each
composable tool owns its own file(s) and its own slash namespace; a project
adopts only the pieces it needs.

## Ubiquitous language

Use these terms exactly. They are cohesive with OpenSpec — in particular, the
unit of work keeps OpenSpec's own word, **Change** (a *proposal* is a document
inside a change; a *spec* is a stable artifact; you *propose / apply / archive* a
change).

| Term | Means |
| --- | --- |
| **Plan** | the roadmap document/effort (`PLAN.md`); one active plan per program |
| **Phase** | a coarse, sequenced chunk of the Plan — goal + acceptance + status |
| **Change** | a unit of work that **carries** a phase's granular tasks (an OpenSpec change by default) |
| **Invariants** | the cross-cutting definition-of-done that holds across *every* phase |
| **Divergence** | a recorded, signed-off deviation from a source of truth |

The linking verb is **carry**: *a phase is carried by one or more changes.*
("Propose the next change for Phase 5." "Phase 4 is carried by changes A–D.")
Give changes friendly labels if you like ("Slice ①", "Change A") but the noun is
always **change**.

The defining sentence:

> **A Plan sequences Phases; each Phase is carried by one or more Changes;
> Invariants hold across all Phases; Divergences are recorded, never silent.**

## The discipline rules (R1–R7)

These are what make the pattern work. They are the spec the skill enforces.

- **R1 — Coarse, never duplicated.** The plan states a phase's goal, deliverables
  (coarse), acceptance, and status. The *granular* task list lives only in the
  carrying change. Never copy tasks into the plan.
- **R2 — Point, don't restate.** The plan links to the sources of truth (PRD,
  specs, design docs) and never re-explains them.
- **R3 — Every phase maps to changes.** Each phase names the change(s) that carry
  it, each with a lifecycle state: *not yet proposed → proposed → applied →
  archived.*
- **R4 — Status reflects reality.** Checkboxes and status lines are kept current
  as work lands. The plan is resumable: anyone (human or agent) can read it and
  know exactly where things stand.
- **R5 — Divergences are recorded, never silent.** Any deviation from a source of
  truth is written down inline in the phase, with a short rationale and a
  sign-off.
- **R6 — Invariants are a DoD overlay.** Cross-cutting invariants hold every
  phase. A phase that violates one is not done, however green its own acceptance.
- **R7 — Plans are kept, not discarded.** A completed plan is archived (not
  deleted) for historical record, exactly as changes are.

## PLAN.md anatomy

A plan is **prose-first** — readable by a human with no tooling. The shape (see
`skills/plan/templates/PLAN.md`) is:

```
   header ........... Program · Status · Engine · Started · Completed · Sources
   legend ........... [ ] not started · [~] in progress · [x] done
   sequencing ....... the decided strategy + rationale (optional but encouraged)
   Phase[] .......... goal · deliverables[] · acceptance · status · carried-by
                      · divergences[]
   Invariants ....... the cross-cutting DoD overlay
   Out of scope ..... what not to pull forward
```

The **header is the prose "frontmatter"** — it carries plan identity and
lifecycle, and it declares the engine (the seam, below):

```
   **Program:** <name> · **Status:** active · **Engine:** OpenSpec (`openspec/changes/`)
   **Started:** YYYY-MM-DD · **Completed:** —
   **Sources of truth:** <links — read these, don't restate them>
```

## The engine seam (composability)

Plan does not hard-code OpenSpec. The plan **declares** its change engine in the
header (`Engine: OpenSpec`), and the skill drives whatever is declared, defaulting
to OpenSpec. To carry a phase, the `next` driver proposes / applies / archives a
unit of work via the declared engine. If a project ever uses a different change
tool, it declares that instead and the same skill adapts. **The coupling lives in
data, not code.**

## Plan lifecycle

```
   PLAN.md  (root, the ONE active plan)
      │  work proceeds: phases land, changes archive, checkboxes flip
      │  plan:archive  (when the program completes)
      ▼
   plans/archive/YYYY-MM-DD-<program>.md   (frozen historical record)
      │  plan:create  (optionally carrying forward unfinished phases)
      ▼
   PLAN.md  (a fresh active plan for the next program: v3.1, v4, …)
```

- **Active plan = `PLAN.md` at the repo root.** Single, well-known location;
  conventional like `README`/`CHANGELOG`; the thing `CLAUDE.md` points at.
- **Archived plans = `plans/archive/YYYY-MM-DD-<program>.md`**, date-prefixed so
  they sort chronologically and pair visually with OpenSpec's
  `openspec/changes/archive/YYYY-MM-DD-<name>/`. The completion date is the
  prefix; program identity is the suffix (`2026-06-11-minerva-v3.md`).
- An archived plan **remains a valid index** into archived changes — its
  `Carried by: <name>` references still resolve to `openspec/changes/archive/…`.
  Archiving a plan does **not** touch OpenSpec.
- **One active plan at a time** (default). The `plans/` model extends trivially
  to multiple concurrent plans if ever needed, but that is out of scope here.

## Commands

**Few verbs; the skill guides the path.** Five commands, with `/plan:next` doing
the heavy lifting as a stateful driver:

| Command | Does |
| --- | --- |
| `/plan:create` | discuss the program, then scaffold a fresh `PLAN.md` (guards an incomplete active plan first) |
| `/plan:status` | derived progress: current phase, phase states, carrying-change states, what's next |
| `/plan:next` | **the driver** — read where things stand, then carry the plan to its next state: propose/apply/archive the right change, close a finished phase, advance to the next |
| `/plan:archive` | finalize a complete plan → move to `plans/archive/`, optionally chain into `/plan:create` |
| `/plan:validate` | drift check: plan checkboxes ↔ real change state (`openspec list`) |

`/plan:next` absorbs what used to be two confusing verbs (`next` + `advance`):
there is now one driver, not a *begin* verb and a *finish* verb that read alike.

Natural language reaches the same procedures via the `plan` skill — e.g.
*"let's start a new plan"*, *"where are we?"*, *"what's next?"*, *"land this
phase"* — so the commands are explicit doors, not the only way in. The `/plan:*`
slash commands are the **Claude Code plugin** surface; installed as a bare skill
on any other agent, the same five procedures are reached by intent alone (Agent
Skills are model-invoked, not slash-triggered).

### The `next` driver

`/plan:next` is **stateful and resumable**: it derives everything it needs from
`PLAN.md` plus the change engine, so it works across sessions and from subagents.
One invocation:

1. **Locates** the active `PLAN.md` (if none, offers `/plan:create` and stops).
2. **Reads state** — parses `PLAN.md` (phases, checkboxes, `Carried by:` +
   per-change lifecycle state) and queries the engine for ground truth via
   `openspec list --json` (each active change's `status` +
   `completedTasks`/`totalTasks`; absent from the list ⇒ archived). Per-change
   detail is `openspec status --change <id> --json`.
3. **Lightly reconciles** obvious drift it sees while driving (e.g. the engine
   reports a change archived but the plan still says `applied`). Deep
   reconciliation remains `/plan:validate`'s job.
4. **Finds position** — the first phase not `[x]`, and within it the first
   carrying change not yet `archived`.
5. **Performs the next transition** for that change:

   | Change state | Transition | Mode |
   | --- | --- | --- |
   | not yet proposed | offer **propose** vs **explore**; hand the chosen `opsx:*` to a subagent | confirm — a decision that starts work |
   | proposed | **apply** via a subagent | confirm — real work |
   | applied (engine reports complete) | **archive** via a subagent | auto-chain — mechanical cleanup |
   | archived, more changes in phase | advance to the next change → propose… | auto-chain, then stop at the propose decision |
   | archived, last change in phase | **close the phase**: flip `[x]`, stamp Status + date + a one-line outcome | auto-chain |
   | all phases `[x]` | suggest `/plan:archive` | confirm |

6. **Loops until it needs you** — auto-chains cheap bookkeeping transitions
   (archive a completed change, close a phase, advance to the next), but **stops
   to confirm** before real work (propose/apply) or any decision, always showing
   the action and the command it will run first.
7. **Persists after each transition** — updates the change's lifecycle state,
   checkbox, and Status line in `PLAN.md` so any later session resumes cleanly;
   records any **divergence** (R5) surfaced while landing.

**Subagent by default.** Engine handoffs run in a subagent to keep the driver
session light. The driver passes the engine command + change name + seed context
(phase goal, acceptance bar, sources of truth, the suggested change notes from
`PLAN.md`); the subagent runs the `opsx:*` command and returns a concise summary +
resulting state, which the driver writes back into `PLAN.md`.

## Composable principles (the constellation)

- **The document is the state.** No central store; each tool owns its own
  file(s).
- **Own your namespace.** Plan owns `plan:*`; issues, openspec, etc. own theirs.
  No dispatcher.
- **Opt in per project.** A project uses Plan + a change engine + (optionally) an
  issue inbox + memory, picking only what it needs.
- **Issues live alongside.** An issue inbox is the place to capture ideas / bugs
  / feature-requests found mid-flight; an issue may *graduate* into a phase or a
  change. That hand-off is a convention, not an integration.

## Non-goals / deferred

- **No validator CLI yet.** `/plan:validate` runs as an agent-driven check
  against `openspec list`. A fast/CI-able CLI is a later addition, not a
  dependency.
- **No memory extraction here.** Durable project memory is brain's last remaining
  piece; it is orthogonal to Plan and is a separate future extraction.
- **No multiple concurrent active plans.** Single active plan by default.
- **No strict schema.** Plans stay prose; tooling does light, forgiving parsing
  (checkbox states, `Carried by:` lines) — never demands frontmatter.
