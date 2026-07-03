import { v } from "convex/values";

export const vProject = v.object({
  name: v.string(),
  repoRoot: v.string(),
  remoteUrl: v.optional(v.string()),
  defaultBranch: v.optional(v.string()),
  searchText: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});
