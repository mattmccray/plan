# Testing / Dev

Plan ships as an [Agent Skill](https://agentskills.io) (`skills/plan/`) with an
optional Claude Code plugin wrapper (the repo is its own marketplace via
`.claude-plugin/marketplace.json`, and `commands/*.md` add the `/plan:*` slash
commands). To test the live repo without publishing:

## Local install

Add this repo as a local marketplace, then install the plugin:

```
/plugin marketplace add /Users/mattm/Projects/Elucidata/plan
/plugin install plan@plan-tools
```

After editing skills/commands, reload:

```
/reload-plugins
```

## Verify

In any project, run:

```
/plan:create "Test Program"
```

The `create` command should guard any existing `PLAN.md`, discuss the program,
and scaffold a new `PLAN.md` from `skills/plan/templates/PLAN.md`. Then drive it with
`/plan:next` (the stateful driver), and try `/plan:status` and `/plan:validate`.

Natural language should also trigger the workflow skill — e.g. "let's start a new
plan" or "where are we on the plan?".

## Structure check

```
plan/
├── .claude-plugin/{plugin.json, marketplace.json}
├── skills/plan/{SKILL.md, templates/PLAN.md}
├── commands/{create,status,next,archive,validate}.md
├── DESIGN.md      # ratified model — source of truth
├── CLAUDE.md      # repo conventions
└── README.md
```

## Publish

Push to GitHub. Users install the skill into any skills-compatible agent with:

```
npx skills add <github-user>/plan
```

Claude Code users can instead install the plugin (adds the `/plan:*` slash
commands):

```
/plugin marketplace add <github-user>/plan
/plugin install plan@plan-tools
```
