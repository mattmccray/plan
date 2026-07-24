# Plan

## General

There should be few commands, and the skill(s) should be helpful and guide you along the path. Automating calls to the change engine, optionally using subagents.

It should maintain enough stateful information that it can be run across multiple agent sessions or from subagents.

## Usage Example

If there's no plan, you create one:

> Let's create a plan to ___

Or:

> /plan:create Let's work on ___

This is how to start a plan, it starts a dialogue with the user and the result is a new PLAN.md with phases and suggested/sparse change notes.

Now that we have a plan with phases, I'd like for the user to be able to use the same command to advance from change to change, and if done with the changes within a given phase, it should close the phase and advance to the next. As a general rule it should give a brief summary of what's next and, optionally, what command will be run asking the user to confirm before either doing the work or handing off to the change engine (case depending).

So, something like:

> /plan:next

We only just started, so next is to start the first phase, first change. It's likely not proposed yet, we'd see something like:

> Starting Phase 1.
>
> The plan suggest we start with change Change A. Do you want me to `/opsx:propose change-a`, or would you rather `/opsx:explore` the change first?

Then the user chooses. If they choose explore, then we should start opsx:explore mode seeded with any info it would need to get started. If they choose propose, then we should do that.

Whichever path they take, they'll wind up with a proposed change. Then, if they run `/plan:next` again, it will see the proposed change and prompt to `/opsx:apply change-a`.

The work gets done, they troubleshoot, etc. And then then run `/plan:next` again. We can tell the change is now applied, so we can suggest `/opsx:archive` that change.

All the while, we're updating the PLAN.md to keep this straight.

This cycle continues until the end of the plan, at which time we prompt them if they want to `/plan:archive`.

At any point they can run `/plan:status` to get a summary of the progess, what's in-process (if anything) and what's next.

Also, if the user, or the agent, wants to they can run `/plan:validate` which will ensure that the PLAN.md is up to date and in sync with the change engine. If changes are required, it should explain what needs to be done and offers to make the updates if the user chooses.