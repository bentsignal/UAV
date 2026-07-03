---
name: setup
description: Initialize UAV on a local machine. Use when the user asks to set up, bootstrap, install, configure, onboard, or reconfigure the UAV project, including dependency installation, shell aliases/functions, Convex login/project/deployment setup, and first-run validation.
---

# Setup

## Goal

Guide the user through a local-first UAV setup. Prefer agent-assisted setup over a rigid installer: explain choices, ask only for decisions the user must make, run deterministic commands yourself, and verify each layer before moving on.

## Workflow

1. Confirm the UAV repo path and inspect the current state:
   - `pwd`
   - `git status --short --branch`
   - `pnpm --version`
   - `node --version`
   - `pnpm --filter @uav/cli uav help`
2. Install dependencies with `pnpm install` if needed. If pnpm prompts about build approvals, use the non-interactive approval command when appropriate and explain what is being approved.
3. Determine the shell configuration target, then ask only if needed.
   - Inspect `$SHELL`, the login shell where available, and existing shell config files.
   - If the active/login shell clearly maps to one common config file, use that as the default and tell the user what you inferred. For zsh, default to `~/.zshrc`.
   - Ask before editing when the shell is ambiguous, when multiple plausible config files exist, when the user has a nonstandard shell, or when the user may want a different alias/function name.
   - Default command names: both `UAV` and `uav`.
   - Do not assume the user wants shell files edited if they ask only for diagnostics.
4. Add or update shell functions, not a brittle alias. The function should `cd` into the UAV repo and forward all arguments:

   ```zsh
   UAV() {
     (cd "$HOME/dev/projects/uav" && pnpm --filter @uav/cli uav "$@")
   }

   uav() {
     UAV "$@"
   }
   ```

   Adjust the path and function names to match the user’s choices. Avoid duplicating existing blocks; update the existing UAV block if present.
5. Configure Convex intentionally. Read `references/convex.md` before this step.
   - Check the installed Convex package version.
   - Have the user authenticate if needed.
   - Help the user create or select the UAV Convex project/deployment.
   - Prefer a single cloud dev deployment for UAV unless the user explicitly asks for prod/staging.
   - Capture the Convex URL needed by the CLI as `UAV_CONVEX_URL`.
6. Verify setup:
   - `UAV help` or chosen alias equivalent
   - `UAV context --json`
   - `UAV start`, then `curl -fsS http://127.0.0.1:4787/health`
   - A Convex-backed command such as `UAV report "UAV setup smoke test"` once Convex is configured
   - `pnpm run lint`
   - `pnpm run typecheck`
7. Summarize what changed, what remains manual, and how to reload the shell.

## Convex Setup Rules

- Never imply Convex is configured until a command has successfully selected or created a deployment and a URL is available.
- Use the project’s local dependency where possible: `pnpm --filter @uav/convex exec convex ...`.
- If the installed Convex CLI is older than the command you plan to use, update the `convex` dependency or use the older `convex dev` interactive flow.
- Do not deploy to a production Convex deployment unless the user explicitly asks. UAV is intended to use one cloud dev deployment.
- If `convex dev` starts a long-running process, keep it running only when the user wants a watcher. For one-time setup, stop after confirming generated files/env values are written and functions have synced.

## Shell Safety

- Before editing a shell file, read the relevant section and preserve unrelated user configuration.
- Prefer a clearly marked block:

  ```zsh
  # UAV local CLI
  ...
  ```

- After editing shell config, test with an interactive shell, e.g. `zsh -ic 'type UAV && UAV help'`.
- Tell the user to open a new terminal or run `source <shell-file>` when needed.

## Troubleshooting

- If bare `uav` prints help and exits nonzero, fix the CLI root action so help exits cleanly.
- If `UAV start` starts multiple daemons, fix the daemon health check before continuing.
- If Convex commands operate on an unexpected deployment, stop and inspect `.env.local`, `CONVEX_DEPLOYMENT`, and the output of relevant `convex deployment --help`, `convex deployment select`, or `convex data` commands.
- If the CLI cannot see `UAV_CONVEX_URL`, add it to the user’s shell config or document the env file the user should source.
