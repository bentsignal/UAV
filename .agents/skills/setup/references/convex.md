# Convex CLI Notes For UAV Setup

Use official Convex docs as the source of truth when commands differ from this reference.

## Version Checks

Run:

```bash
pnpm --filter @uav/convex exec convex --version
pnpm --filter @uav/convex list convex
```

UAV currently uses `convex@1.39.1`, which is new enough for `convex deployment create`. Official Convex docs say `npx convex deployment create` requires Convex package version `1.34.0` or later.

## Login

If the user is not authenticated, run:

```bash
pnpm --filter @uav/convex exec convex login
```

Follow the browser/device prompts with the user.

## Create Or Configure A Project

The standard interactive flow is:

```bash
pnpm --filter @uav/convex exec convex dev
```

Official Convex docs state that the first `convex dev` in a project can prompt the user to log in and create a new Convex project. It also writes local project configuration such as `CONVEX_DEPLOYMENT` in `.env.local` and syncs functions to the dev deployment.

For UAV, guide the user to create/select a cloud dev deployment, not a production deployment, unless they explicitly ask otherwise.

To confirm a selected cloud deployment is reachable, run:

```bash
pnpm --filter @uav/convex exec convex data --limit 5
```

This should print UAV table names such as `projects`, `agents`, `events`, `notes`, `tasks`, `sessions`, and `proposals` after setup has synced.

## Deployment Create

For manual deployment creation, Convex documents:

```bash
pnpm --filter @uav/convex exec convex deployment create
pnpm --filter @uav/convex exec convex deployment create dev/uav --type=dev --select
```

Use `--select` when the new deployment should become the active deployment for this checkout.

Do not use `convex deployment list`; it is not available in `convex@1.39.1`. Check command availability with:

```bash
pnpm --filter @uav/convex exec convex deployment --help
```

## URL For The CLI

The UAV CLI expects one of:

```bash
export UAV_CONVEX_URL="https://..."
export CONVEX_URL="https://..."
```

Prefer `UAV_CONVEX_URL` for clarity. If Convex writes a different variable name, inspect `.env.local` and help the user map it to `UAV_CONVEX_URL` in their shell config.

## Sources Checked

- Convex CLI overview: `https://docs.convex.dev/cli/overview`
- Convex multiple deployments: `https://docs.convex.dev/production/multiple-deployments`
- Convex deployment reference: `https://docs.convex.dev/cli/reference/deployment`
