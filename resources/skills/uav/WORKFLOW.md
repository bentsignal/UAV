# uav workflow

Use uav as shared project memory and durable work tracking:

1. Start by checking project context and current work with `uav status`.
2. Ask natural-language questions with `uav ask <question>` when product
   direction, architecture intent, fuzzy memory, or related work would help the
   task.
3. Check durable project intent with `uav intent` when you specifically need
   the raw saved intent notes.
4. Check durable project notes with `uav notes`, global inbox notes with
   `uav notes --global`, or search across scopes with `uav notes --all <query>`.
5. Use `uav task list` to inspect durable work items, optionally narrowing with
   `--status` or `--priority`. Use `uav task add` for larger goals, bugs, ideas,
   chores, or follow-up tasks that should outlive the current agent context.
   Task creation checks for likely duplicates before writing anything; prefer an
   existing task, clarify a genuinely distinct scope, or add a child task when a
   match is returned.
6. Mark a task `in_progress` when taking responsibility for it. This claims the
   task for the current run. Before delegating durable work to a child agent,
   claim the task and include its task ID in the child's prompt; the orchestrator
   remains responsible for recording the child's outcome.
7. During work, record decisions, discoveries, blockers, validation results, and
   other context worth preserving with `uav remember`.
8. Use `blocked` for work intended now but waiting on something, optionally with
   `--blocked-by <task-id>`. Use `deferred` for deliberately postponed work.
   Blocked, deferred, and canceled tasks require `--reason`; done tasks require
   `--evidence`.
9. Before the final response, run `uav closeout`. Every task claimed by the
   current run must be done with evidence, blocked/deferred/canceled with a
   reason, or returned to todo with a reason. Resolve anything it reports and
   repeat `uav closeout` until it succeeds.
10. When finishing or pausing, store any durable outcome or follow-up as a note,
   intent note, or work item.
11. If uav needs a better schema, workflow, retrieval behavior, or CLI surface,
   record an improvement request with `uav request`.

Treat the repository's current code, configuration, and tests as the source of
truth for how the software works now. Use uav to preserve why work was done,
when it happened, the intent and decisions behind it, validation outcomes, and
findings that are not obvious from the code. Implementation notes and completed
tasks are historical context, not competing runbooks; tie snapshots to a commit
when useful, and inspect the current repository before relying on old mechanics.

Keep the API intentionally thin. Prefer improving the behavior behind existing
commands such as `uav ask`, `uav status`, `uav remember`, `uav intent`,
`uav task`, and `uav request` over adding specialized commands. New top-level
commands should be rare and should only exist when the thin API cannot express
an important workflow cleanly.

Use `uav remember` for project-scoped memory, `uav intent <message>` or
`uav remember --intent <message>` for durable project intent, and `uav idea` or
`uav remember --global` for one-off ideas that should not belong to a specific repository.

Store concise information that will matter later: goals, decisions, findings,
blockers, follow-ups, validation results, loose ideas, and requests for uav to evolve.
