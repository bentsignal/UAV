import { v } from "convex/values";

export const vAgent = v.object({
  name: v.string(),
  host: v.optional(v.string()),
  kind: v.string(),
  metadata: v.optional(v.any()),
  lastSeenAt: v.number(),
});
