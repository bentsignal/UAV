# Ruby UAV Setup Thread Notes

Source: `/Users/shawn/.codex/attachments/ec8edf34-2fae-43d1-b59e-f9d6adb3a6bc/pasted-text.txt`

## What Went Wrong

- The agent treated `uav` like an installable binary or skill package instead of simply running the user's `UAV` command.
- Non-interactive shell execution did not source `~/.zshrc`, so plain `uav` failed with `command not found`.
- Running through `zsh -ic` made the shell function available, but forced the agent to think about shell loading behavior.
- The existing shell function changed into the UAV repo before running the CLI, which means project detection happens from the UAV repo unless caller context is preserved separately.
- The durable skill text told agents to use `UAV help` / `uav help`, but did not clearly say "do not locate, install, wrap, or invoke through pnpm/zsh; just run the command."

## Conversation Excerpt

User:

> I want you to set this project up to use uav. Install the skill with the uav command.

Agent:

> I’ll use the skill-installer workflow here since you explicitly asked to install a skill, then I’ll inspect the project to see what “uav” setup expects in this repo.

The agent loaded the skill-installer skill, inspected the project, tried `command -v uav`, read `package.json`, tried `pnpm exec uav --help`, and searched for `AGENTS.md`.

User:

> uav is a cli I have installed, use that

Agent:

> Got it, thanks for the correction. I’ll use the installed uav CLI directly and first locate it in your shell environment, since my first command -v didn’t see it in the non-interactive PATH.

The agent searched shell config and ran `zsh -ic 'type -a uav; uav --help'`.

Agent:

> The CLI is a shell function from your .zshrc, so I’m invoking it through zsh -ic. It exposes uav skill, which looks like the path for installing the durable Codex skill.

User:

> What is all this weird stuff you're talking about using yeah it's a fucking function in Z shell but you should just just use UAV like just run UAV.

Agent:

> I overcomplicated that. I’m going to run the uav command directly now and use its output to install the skill.

Command:

```text
uav skill
zsh:1: command not found: uav
```

Agent:

> uav is only available after your interactive Zsh config loads, so the plain command shell can’t see it. I’m running the same command through interactive Zsh so the function is available.

Command:

```text
zsh -ic 'uav skill'
```

This succeeded and printed the durable UAV skill text. The agent then began installing that skill into Codex's local skills folder.

## Better Approach

- Install a real executable shim at `~/.local/bin/UAV` and `~/.local/bin/uav`.
- Have the shim set `UAV_CONTEXT_CWD` to the directory where the command was invoked.
- Run the UAV CLI from the UAV checkout using `pnpm --dir`, without making agents think about `cd`, `pnpm`, `.zshrc`, or `zsh -ic`.
- Teach the CLI to prefer `UAV_CONTEXT_CWD` for project detection.
- Keep the shell functions only as compatibility wrappers that delegate to the executable command.
- Update the durable skill text so agents are told to run `UAV` directly and stop if the command is unavailable.
