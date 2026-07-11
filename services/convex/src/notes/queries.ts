import { v } from "convex/values";

import { authedQuery } from "../functions";
import { vNoteKind } from "./validators";

export const listForProject = authedQuery({
  args: {
    projectId: v.id("projects"),
    kind: v.optional(vNoteKind),
    limit: v.optional(v.number()),
    query: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 25, 1), 100);
    const search = args.query?.trim();

    if (search) {
      const notes = await ctx.db
        .query("notes")
        .withSearchIndex("search_body", (q) =>
          q.search("body", search).eq("projectId", args.projectId),
        )
        .take(limit);

      return args.kind
        ? notes.filter((note) => note.kind === args.kind)
        : notes;
    }

    const notes = await ctx.db
      .query("notes")
      .withIndex("by_project_createdAt", (q) =>
        q.eq("projectId", args.projectId),
      )
      .order("desc")
      .take(limit);

    return args.kind ? notes.filter((note) => note.kind === args.kind) : notes;
  },
});

export const listGlobal = authedQuery({
  args: {
    limit: v.optional(v.number()),
    query: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 25, 1), 100);
    const search = args.query?.trim();

    if (search) {
      return await ctx.db
        .query("notes")
        .withSearchIndex("search_body", (q) =>
          q.search("body", search).eq("scope", "global"),
        )
        .take(limit);
    }

    return await ctx.db
      .query("notes")
      .withIndex("by_scope_createdAt", (q) => q.eq("scope", "global"))
      .order("desc")
      .take(limit);
  },
});

export const listAll = authedQuery({
  args: {
    limit: v.optional(v.number()),
    query: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 25, 1), 100);
    const search = args.query?.trim();

    if (search) {
      return await ctx.db
        .query("notes")
        .withSearchIndex("search_body", (q) => q.search("body", search))
        .take(limit);
    }

    return await ctx.db
      .query("notes")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);
  },
});
