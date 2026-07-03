---
name: reset-project
description: Reset the local UAV checkout and user-local UAV command setup back to a fresh setup-test baseline. Use only when the user explicitly asks to reset, clean, wipe, or return this UAV project to a fresh install state for setup testing.
---

# Reset Project

## Workflow

Use this skill only after an explicit user request. Do not invoke it for routine cleanup, formatting, build failures, or unrelated repo work.

1. Confirm the current directory is the UAV repo before deleting anything:
   - `pwd`
   - `git status --short --branch`
2. Remove only UAV setup/install state:
   - User-local `uav` shims or aliases/functions that point to this checkout.
   - The clearly marked UAV shell config block with `UAV_HOME`, `UAV_AGENT_KIND`, `UAV_AGENT_COMMAND`, or `UAV_CONVEX_URL`.
   - `services/convex/.env.local`.
   - Generated dependency and cache folders: `node_modules`, `.turbo`, `.cache`, `.pnpm-store`.
   - `.DS_Store` files inside the repo.
3. Before removing any `uav` command, inspect it enough to confirm it belongs to this checkout. If it points somewhere else or is ambiguous, leave it alone and ask the user.
4. Preserve source files, lockfiles, git metadata, editor settings, and unrelated shell configuration.
5. Verify the reset:
   - `type -a uav || true`
   - `whence -a uav || true` when running zsh.
   - Search common shell files for UAV exports or aliases.
   - Search the repo for remaining generated folders and local env files.

If code or skill files were changed before the reset, run the repo-required validation before deleting dependencies:

1. `pnpm run lint`
2. `pnpm run typecheck`
3. `pnpm run format:fix` if lint and typecheck succeed.
