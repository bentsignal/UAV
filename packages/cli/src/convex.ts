import { ConvexHttpClient } from "convex/browser";

import { api } from "@uav/convex/api";

import { getAuthToken } from "./auth.ts";
import { getConvexUrl } from "./config.ts";
import { getRepoContext } from "./context.ts";

export type UavClient = Awaited<ReturnType<typeof createUavClient>>;

export async function createUavClient() {
  const auth = await getAuthToken();
  return new ConvexHttpClient(getConvexUrl(), auth ? { auth } : undefined);
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
