# Plan

A coarse, resumable **program layer** for AI coding agents — the epic/roadmap layer that sits *above* a change-management workflow (OpenSpec by default). Ships as an [Agent Skill](https://agentskills.io) (works in any skills-compatible agent) with an optional [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugin that adds `/plan:*` slash commands.

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

Plan is an [Agent Skill](https://agentskills.io) — install it into any
skills-compatible agent (Claude Code, opencode, Codex, Gemini CLI, Cursor, pi, …)
with the [`skills`](https://github.com/vercel-labs/skills) CLI:

```
npx skills add mattmccray/plan
```

That installs the `plan` skill. Trigger it with natural language —
*"let's start a new plan"*, *"where are we?"*, *"what's next?"*, *"land this
phase"* — or a bare verb (`plan next`, `plan status`); the skill routes to the
right procedure. (Skills are activated by intent, not slash commands — that's the
[Agent Skills](https://agentskills.io) model.)

### Claude Code users: the plugin

On Claude Code you can instead install Plan as a **plugin**, which adds real
`/plan:*` slash commands on top of the same skill. The repo is its own
marketplace:

```
/plugin marketplace add mattmccray/plan     # or the full GitHub URL
/plugin install plan@plan-tools
```

To develop against the live repo, see [DEV.md](DEV.md).

## Quick start

Talk to it, or — on the Claude Code plugin — use the slash commands. Both do the
same thing:

| Do this | Natural language | Plugin command |
| --- | --- | --- |
| Start a plan | *"start a new plan for Minerva v3"* | `/plan:create "Minerva v3"` |
| Carry it forward | *"what's next?"* / *"land this phase"* | `/plan:next` |
| Check status | *"where are we?"* | `/plan:status` |
| Finalize | *"the plan's done"* | `/plan:archive` |
| Drift check | *"does the plan match reality?"* | `/plan:validate` |

**next** is the workhorse — invoke it again and again to walk a phase from
*propose → apply → archive*, then auto-close the phase and move to the next. It
loops through bookkeeping on its own and stops to confirm before real work,
keeping `PLAN.md` in sync as it goes.

## Procedures

| Procedure | Description |
| --- | --- |
| **create** | Discuss a program, then scaffold a fresh `PLAN.md` (guards an incomplete active plan first) |
| **status** | Show current phase, phase states, carrying-change states, and what's next |
| **next** | **The driver** — read where things stand, then carry the plan to its next state (propose/apply/archive a change, close a phase, advance) |
| **archive** | Finalize a complete plan → move to `plans/archive/`, optionally start the next |
| **validate** | Drift check: plan checkboxes ↔ real change state |

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
project needs. No central store, no dispatcher; each tool owns its own file (and,
on Claude Code, its own slash namespace).

See [DESIGN.md](DESIGN.md) for the full ratified model.

## License

MIT
