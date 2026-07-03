import { v } from "convex/values";

export const vAgent = v.object({
  name: v.string(),
  host: v.optional(v.string()),
  kind: v.union(
    v.literal("codex"),
    v.literal("claude"),
    v.literal("human"),
    v.literal("other"),
  ),
  metadata: v.optional(v.any()),
  lastSeenAt: v.number(),
});
