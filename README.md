# Plan

A coarse, resumable **program layer** for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — the epic/roadmap layer that sits *above* a change-management workflow (OpenSpec by default).

Tools like OpenSpec take a single unit of work from proposal → implementation → archive, but have **no concept of a program**: a phased roadmap spanning many changes. Plan fills that gap with one human-readable file — `PLAN.md` — that sequences **Phases**, each **carried by** one or more **Changes**.

```
   PLAN.md ............ the roadmap: Phases, sequenced, each carried by Changes
      │ carried by
      ▼
   openspec/changes/ .. Changes (propose → apply → archive) — the work engine
```

Plan is deliberately coarse: it's a spine, not a task tracker. The granular tasks
live only in the change that carries a phase — the plan points at them, never
restates them, so the two never drift. **The document is the state**: everything
needed to resume lives in `PLAN.md` itself.

## Install

Plan is a single-repo Claude Code plugin. The repo is its own marketplace:

```
/plugin marketplace add mattmccray/plan     # or the full GitHub URL
/plugin install plan@plan-tools
```

To develop against the live repo instead, see [DEV.md](DEV.md).

## Quick start

```
/plan:new "Minerva v3"     # discuss the program, scaffold PLAN.md
/plan:next                 # find the next phase, hand off to opsx:propose
/plan:advance              # land a phase: flip the checkbox, stamp status
/plan:status               # where are we? (plan ✕ real change state)
/plan:archive              # finalize a complete plan → plans/archive/
```

You can also just talk to it — *"let's start a new plan"*, *"where are we?"*,
*"what's next?"* — and the `plan-workflow` skill routes to the right procedure.

## Commands

| Command | Description |
| --- | --- |
| `/plan:new` | Discuss a program, then scaffold a fresh `PLAN.md` (guards an incomplete active plan first) |
| `/plan:status` | Show current phase, phase states, carrying-change states, and what's next |
| `/plan:next` | Identify the next phase/deliverable and hand off to the change engine |
| `/plan:advance` | Mark a deliverable/phase done — flip the checkbox, stamp status + date |
| `/plan:archive` | Finalize a complete plan → move to `plans/archive/`, optionally start the next |
| `/plan:validate` | Drift check: plan checkboxes ↔ real change state |

## Core concepts

- **Plan** — the roadmap (`PLAN.md`); one active plan per program.
- **Phase** — a coarse, sequenced chunk: goal + deliverables + acceptance + status.
- **Change** — a unit of work that **carries** a phase's tasks (an OpenSpec change by default).
- **Invariants** — the cross-cutting definition-of-done across every phase.
- **Divergence** — a recorded, signed-off deviation from a source of truth.

> **A Plan sequences Phases; each Phase is carried by one or more Changes;
> Invariants hold across all Phases; Divergences are recorded, never silent.**

## Lifecycle

- **Active plan** = `PLAN.md` at the repo root.
- **Archived plans** = `plans/archive/YYYY-MM-DD-<program>.md`, date-prefixed so
  they pair with OpenSpec's `openspec/changes/archive/`. Completed plans are
  **kept, not deleted** — they're the historical record of *why* a program was
  built the way it was.

## Composability

Plan does not hard-code OpenSpec: the plan **declares** its change engine in its
header, and the workflow drives whatever is declared (defaulting to OpenSpec). It
is one tool in a constellation of single-purpose, AI-first workflow tools — adopt
it alongside a change engine and (optionally) an issue inbox, picking only what a
project needs. No central store, no dispatcher; each tool owns its own file and
its own slash namespace.

See [DESIGN.md](DESIGN.md) for the full ratified model.

## License

MIT
