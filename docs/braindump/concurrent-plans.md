# Concurrent Plan Files

## File Storage

Maybe we could move to a system that's a little more like OpenSpec. Here are a couple of ideas:

Use "README" files as summary and working notes?

```
$/                    -- project root
  plans/
    archive/
      2026-07-21-completed-plan/
        PLAN.md
        README.md
    upcoming-plan/
      PLAN.md
      README.md
    README.md
```

A more "OKF" approach?

```
$/                    -- project root
  plans/
    archive/
      2026-07-21-completed-plan/
        index.md
        log.md
        plan.md
    upcoming-plan/
      index.md
      log.md
      plan.md
    index.md
    log.md
```

**Notes:**

- [ ] Need to verify this matches to OKF spec: [https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
- [ ] Need to have a grill session to discuss the pros and cons of using OKF for this versus just a list of plans.

**Is Simpler Better?**

```
$/                    -- project root
  plans/
    archive/
      2026-07-21-completed-plan.md
    upcoming-plan.md
```

**Notes:**

- [ ] Use a git ignored `.active-plan` file with the path to the currently working plan?

**General Questions:**

- Is there extra data that we need to store alongside of the plan?

**Thoughts/Braindump:**

I think plans could have a status probably already do, but And I think a plan can be in planning mode, which is still being iterated upon and explored, but persisted in its current state. And it probably has a section at the bottom for outstanding questions or to be done kind of deal. And then it can be in a pending state, which means it's ready to go. And then maybe it's in an active state, which means they're actively being worked on. So there are so the traditional flow at this point going through relating them to change proposals, etc.

And then once they're done there would be a completion phase now that would basically wrap everything up, change the statuses, make sure everything is pointing to the right place, and then archive the plan and time stamp it

Maybe the plan create phase can have some information that kind of discusses granularity when it's getting time to create the plan, making sure there's enough information, but definitely not too much because we can already juggle an exploratory phase before we get to development. And that's probably sufficient.

So this Plan skill deals specifically with orchestrating open spec changes and creating those plans so that that can drive the creation of the changes, kind of a top-down approach. Do we need to support some sort of issue tracking automatically, or do can we just trust an agent and tell it we want to create a plan that triages skill of open issues. I don't know, something to explore

## Skill

## Potential Work Session Example

