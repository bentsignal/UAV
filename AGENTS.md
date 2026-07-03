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

## Preferences

- Do **_NOT_** leave excessive comments when writing code. Only leave comments when
  the code itself does not clearly explain what it does
- Keep `uav help` accurate whenever CLI commands, arguments, or descriptions
  change.
