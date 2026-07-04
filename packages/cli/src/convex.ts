import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { ConvexHttpClient } from "convex/browser";

import { api } from "@uav/convex/api";

import { getRepoContext } from "./context.ts";

export type UavClient = ReturnType<typeof createUavClient>;

function readEnvValue(filePath: string, key: string): string | undefined {
  if (!existsSync(filePath)) return undefined;

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (match?.[1] !== key) continue;

    const value = match[2]?.replace(/\s+#.*$/, "").trim();
    if (!value) return undefined;

    return value.replace(/^["']|["']$/g, "");
  }

  return undefined;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function getConvexUrl(): string {
  const uavHome = process.env.UAV_HOME;
  const url =
    process.env.UAV_CONVEX_URL ??
    process.env.CONVEX_URL ??
    unique(
      [
        uavHome ? resolve(uavHome, "services/convex/.env.local") : undefined,
        resolve(process.cwd(), "services/convex/.env.local"),
        resolve(homedir(), "dev/projects/uav/services/convex/.env.local"),
      ].filter((value): value is string => Boolean(value)),
    )
      .map((filePath) => readEnvValue(filePath, "CONVEX_URL"))
      .find(Boolean);

  if (!url) {
    throw new Error(
      "Set UAV_CONVEX_URL or CONVEX_URL before using UAV, or set UAV_HOME so UAV can read services/convex/.env.local.",
    );
  }

  return url;
}

export function createUavClient() {
  return new ConvexHttpClient(getConvexUrl());
}

export async function ensureCurrentProject(client: UavClient) {
  const context = getRepoContext();

  const projectId = await client.mutation(api.projects.mutations.upsert, {
    defaultBranch: context.defaultBranch,
    name: context.name,
    remoteUrl: context.remoteUrl,
    repoRoot: context.repoRoot,
  });

  return { context, projectId };
}
