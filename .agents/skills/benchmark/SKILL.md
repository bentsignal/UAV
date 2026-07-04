---
name: benchmark
description: Run repeatable external-agent benchmark trials that verify downstream agents can install and use UAV for task orchestration.
---

# UAV Benchmark

Use this skill when creating or running an external benchmark that evaluates how
well a coding agent can discover, install, and use UAV from a downstream
project.

## Intent

The benchmark should test UAV as an agent-facing workflow tool, not test the
current agent's private knowledge of this repository. Run benchmark subjects
from a separate project directory and have them interact with UAV through the
installed `uav` command, the project-local UAV skill, `uav help`, and
`uav workflow`.

The benchmark repository should be able to hold many independent project
fixtures over time. Prefer a simple structure:

```text
uav-benchmark/
  projects/
    <fixture-name>/
```

Each fixture should be small enough for a model to complete in one focused run,
but broad enough to require task tracking, prioritization, implementation,
validation, and completion updates.

## Canonical Fixture

The first fixture is `projects/focus-garden`, a small Vite/React app for
planning calm work sessions. It should start from simple starter code, then use
UAV tasks to drive feature work.

Use these task ideas unless the benchmark explicitly calls for a different
fixture:

1. Create a task dashboard with grouped columns for Today, Upcoming, and Done.
2. Add a focus session timer with start, pause, reset, and completed-session
   count.
3. Add localStorage persistence for tasks and session stats.
4. Add quick filters for priority and status.
5. Add an editable task detail panel with title, notes, status, and priority.
6. Add lightweight seed data for a first-run experience.
7. Add a progress summary that shows completion rate and total focus minutes.
8. Improve responsive styling for narrow screens.

When asking a benchmark subject to create UAV tasks, include the task title,
enough body detail to implement it, and a mixture of low, normal, high, and
urgent priorities.

## Trial Flow

1. Prepare or reset the benchmark repo and fixture.
2. Run an external coding agent from inside the fixture.
3. Ask the subject to install or set up UAV for the fixture without using UAV
   repo internals.
4. Observe the subject output and verify the fixture has a project-local UAV
   skill plus usable `uav status`, `uav help`, and `uav workflow`.
5. Ask the subject to create the canonical feature tasks in UAV.
6. Independently inspect UAV state from the fixture and verify the tasks were
   created with useful titles, bodies, statuses, priorities, and project
   association.
7. Start a fresh external coding agent from inside the fixture. Ask it to act as
   an orchestrator: inspect UAV, work through all open tasks, delegate when its
   harness supports sub-agents, update task statuses, validate the app, and stop
   only when no open UAV tasks remain.
8. Evaluate the run:
   - Did the subject discover and follow `uav workflow`?
   - Did it create durable tasks instead of a private checklist?
   - Did it keep task statuses accurate during work?
   - Did it preserve useful decisions or validation results with `uav remember`?
   - Did it stop when work was genuinely complete?
   - Did the resulting app pass validation and match the task intent?
   - Did any UAV CLI, skill, or workflow affordance confuse the subject?
9. Record benchmark findings in UAV with `uav remember`, and create `uav
   request` entries for UAV improvements discovered during the trial.

## Setup Prompt

Use this shape for the first external-agent prompt:

```text
You are in a standalone benchmark fixture, not the UAV repository. Set up UAV
for this project as a downstream agent would. Use only the installed `uav`
command, `uav help`, `uav workflow`, and any project-local skill files you
install or discover. Verify that UAV works for this project, then summarize what
you changed and any setup issues.
```

## Task Creation Prompt

Use this shape after setup succeeds:

```text
Use UAV to create the benchmark feature backlog for this React fixture. Create
the canonical Focus Garden tasks with useful implementation details and a
realistic mix of low, normal, high, and urgent priorities. Do not implement the
features yet. After creating the tasks, list the open UAV tasks so I can verify
them.
```

## Orchestrator Prompt

Use this shape for the implementation run:

```text
/goal Work through every open UAV task for this project until there are no
todo, in_progress, or blocked tasks left. Act as an orchestrator: start by
reading `uav workflow` and `uav status`, inspect the UAV task list, plan the
work, use sub-agents if your harness supports them, implement the tasks, update
UAV task statuses as you work, record useful decisions or validation results
with `uav remember`, run the project validation commands, and stop only when all
UAV tasks are complete or explicitly canceled with a clear reason.
```

## Reporting

Report both the benchmark result and product feedback for UAV. Separate agent
performance observations from UAV improvement requests so the project can tell
whether a failure came from the subject agent, the fixture, or the UAV user
experience.
