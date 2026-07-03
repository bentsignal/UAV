import { execFileSync } from "node:child_process";
import { hostname } from "node:os";
import { basename, resolve } from "node:path";

export interface RepoContext {
  branch?: string;
  defaultBranch?: string;
  name: string;
  remoteUrl?: string;
  repoRoot: string;
  worktreeRoot: string;
}

function readGit(args: string[], cwd = process.cwd()): string | undefined {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

export function getRepoContext(): RepoContext {
  const repoRoot = readGit(["rev-parse", "--show-toplevel"]) ?? process.cwd();
  const worktreeRoot = resolve(repoRoot);
  const remoteUrl = readGit(["config", "--get", "remote.origin.url"], repoRoot);
  const branch = readGit(["branch", "--show-current"], repoRoot);
  const defaultBranchRef = readGit(
    ["symbolic-ref", "refs/remotes/origin/HEAD", "--short"],
    repoRoot,
  );
  const defaultBranch = defaultBranchRef?.replace(/^origin\//, "");

  return {
    branch,
    defaultBranch,
    name: basename(worktreeRoot),
    remoteUrl,
    repoRoot: worktreeRoot,
    worktreeRoot,
  };
}

export function getAgentName(): string {
  return process.env.UAV_AGENT_NAME ?? process.env.USER ?? "unknown-agent";
}

export function getHostName(): string {
  return hostname();
}
