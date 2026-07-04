# AGENTS.md

## Repository Summary

UAV is a Convex-backed coordination system for local coding agents. It exposes
a TypeScript CLI and local daemon boundary so agents can track projects,
sessions, tasks, events, notes, and requests for UAV capability/schema changes.

## Required Validation After Changes

At the end of every run, run the following commands in order:

1. `pnpm run lint`
2. `pnpm run typecheck`

If all of these succeed, run:

4. `pnpm run format:fix`

Then summarize changes for the user.

## Workflow

- Keep `uav help` and `uav workflow` accurate whenever CLI commands, arguments, or descriptions
  change.
