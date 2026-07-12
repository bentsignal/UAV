import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { authedAction } from "../functions";
import { vTaskKind, vTaskPriority } from "./validators";

const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_DIMENSIONS = 1024;
const DUPLICATE_TASK_SCORE = 0.88;

interface SimilarityArgs {
  body?: string;
  kind?: Doc<"tasks">["kind"];
  priority?: Doc<"tasks">["priority"];
  title: string;
}

interface Candidate {
  body?: string;
  id: Id<"tasks">;
  score: number;
  status: Doc<"tasks">["status"];
  title: string;
}

function candidateText(args: SimilarityArgs) {
  return [
    `Type: ${args.kind ?? "task"}`,
    "Status: todo",
    `Priority: ${args.priority ?? "normal"}`,
    `Title: ${args.title}`,
    args.body,
  ]
    .filter(Boolean)
    .join("\n");
}

function upsertCandidate(
  candidates: Map<string, Candidate>,
  task: Doc<"tasks">,
  score: number,
) {
  const current = candidates.get(task._id);
  if (current && current.score >= score) return;
  candidates.set(task._id, {
    body: task.body,
    id: task._id,
    score,
    status: task.status,
    title: task.title,
  });
}

export const findSimilar = authedAction({
  args: {
    projectId: v.id("projects"),
    parentTaskId: v.optional(v.id("tasks")),
    title: v.string(),
    body: v.optional(v.string()),
    kind: v.optional(vTaskKind),
    priority: v.optional(vTaskPriority),
  },
  handler: async (ctx, args) => {
    const queryEmbedding = await embed({
      model: openai.embedding(EMBEDDING_MODEL),
      providerOptions: { openai: { dimensions: EMBEDDING_DIMENSIONS } },
      value: candidateText(args),
    });
    const matches = await ctx.vectorSearch("memoryEmbeddings", "by_embedding", {
      filter: (q) => q.eq("projectId", args.projectId),
      limit: 12,
      vector: queryEmbedding.embedding,
    });
    const matchScores = new Map(
      matches.map((match) => [match._id, match._score]),
    );
    const sources = await ctx.runQuery(
      internal.memorySources.fetchSearchResults,
      { ids: matches.map((match) => match._id) },
    );
    const candidates = new Map<string, Candidate>();

    for (const item of sources) {
      if (!("title" in item.source)) continue;
      if (item.source.status === "canceled") continue;
      if (item.source._id === args.parentTaskId) continue;
      const score = matchScores.get(item.embedding._id);
      if (score === undefined || score < DUPLICATE_TASK_SCORE) continue;
      upsertCandidate(candidates, item.source, score);
    }

    return {
      candidates: [...candidates.values()].sort((a, b) => b.score - a.score),
      usage: queryEmbedding.usage,
    };
  },
});
