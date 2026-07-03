import { v } from "convex/values";

export const vProposalStatus = v.union(
  v.literal("open"),
  v.literal("accepted"),
  v.literal("rejected"),
  v.literal("implemented"),
);

export const vProposalKind = v.union(
  v.literal("schema"),
  v.literal("capability"),
  v.literal("policy"),
  v.literal("other"),
);

export const vProposal = v.object({
  projectId: v.optional(v.id("projects")),
  sessionId: v.optional(v.id("sessions")),
  agentId: v.optional(v.id("agents")),
  kind: vProposalKind,
  status: vProposalStatus,
  title: v.string(),
  body: v.string(),
  searchText: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});
