import { ConvexHttpClient } from "convex/browser";

import { api } from "@uav/convex/api";

import { getAgentName, getHostName, getRepoContext } from "./context.ts";

export type UavClient = ReturnType<typeof createUavClient>;

function getConvexUrl(): string {
  const url = process.env.UAV_CONVEX_URL ?? process.env.CONVEX_URL;
  if (!url) {
    throw new Error("Set UAV_CONVEX_URL or CONVEX_URL before using UAV.");
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

export async function ensureCurrentAgent(client: UavClient) {
  return await client.mutation(api.agents.mutations.upsert, {
    host: getHostName(),
    kind: "codex",
    lastSeenAt: Date.now(),
    name: getAgentName(),
  });
}
