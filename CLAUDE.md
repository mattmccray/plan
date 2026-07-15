# CLAUDE.md

Guidance for working in this repository.

## What this is

**Plan** is a Claude Code plugin: the program/epic layer above a
change-management workflow (OpenSpec by default). There is no runtime, no
dependencies, and no build step — everything is plain markdown plus two JSON
manifests.

The ratified model — vocabulary, discipline rules (R1–R7), artifact shape, and
lifecycle — lives in [DESIGN.md](DESIGN.md). **DESIGN.md is the source of truth.**
When the skill, commands, or template disagree with it, fix one — don't let them
drift.

## Repository structure

- `.claude-plugin/plugin.json` — the plugin manifest (name `plan`, namespaces all
  commands as `plan:*`).
- `.claude-plugin/marketplace.json` — makes this repo installable as its own
  marketplace (`source: "./"`).
- `skills/plan/SKILL.md` — the single source of truth for behavior: the
  model + the procedures every command delegates to. Auto-triggers on
  plan-related natural language.
- `commands/*.md` — five thin verbs (`create`, `status`, `next`, `archive`,
  `validate`) that inject context and delegate to the workflow skill. `next` is
  the stateful driver that carries the plan from change to change and phase to
  phase (it absorbed the old `advance`).
- `skills/plan/templates/PLAN.md` — the prose template scaffolded into a consuming project by
  `/plan:create`.

## Conventions

- **Prose-first.** Plans are human-readable markdown; never impose a rigid schema
  or required frontmatter. Tooling does light, forgiving parsing.
- **One source of truth per fact.** The model lives in the workflow skill;
  commands stay thin and reference it rather than restating procedures.
- **Keep the seam.** Don't hard-code OpenSpec in the skill/commands; drive the
  engine the plan's header declares, defaulting to OpenSpec.
- **`${CLAUDE_PLUGIN_ROOT}`** resolves to this plugin's install directory at
  runtime — use it to locate `skills/plan/templates/PLAN.md`.

## Editing the skill or commands

When you change behavior, update [DESIGN.md](DESIGN.md) in lockstep, and keep the
workflow skill and the commands consistent — the commands must not describe a
procedure that contradicts the skill.
