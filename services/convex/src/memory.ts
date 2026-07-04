import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_DIMENSIONS = 1024;
const CHUNK_TARGET_CHARS = 1600;
const CHUNK_OVERLAP_CHARS = 240;

type Source = Doc<"notes"> | Doc<"tasks">;

interface SourceChunk {
  index: number;
  text: string;
}

function projectSources(sources: {
  notes: Doc<"notes">[];
  tasks: Doc<"tasks">[];
}) {
  return sources;
}

function searchSources(
  sources: {
    embedding: Doc<"memoryEmbeddings">;
    source: Source;
  }[],
) {
  return sources;
}

function embeddingOptions() {
  return {
    openai: {
      dimensions: EMBEDDING_DIMENSIONS,
    },
  };
}

function embeddingModel() {
  return openai.embedding(EMBEDDING_MODEL);
}

function noteMemoryText(note: Doc<"notes">) {
  return [
    `Type: ${note.kind}`,
    note.tags.length > 0 ? `Tags: ${note.tags.join(", ")}` : undefined,
    note.body,
  ]
    .filter(Boolean)
    .join("\n");
}

function taskMemoryText(task: Doc<"tasks">) {
  return [
    `Type: ${task.kind}`,
    `Status: ${task.status}`,
    `Priority: ${task.priority}`,
    task.tags.length > 0 ? `Tags: ${task.tags.join(", ")}` : undefined,
    `Title: ${task.title}`,
    task.body,
  ]
    .filter(Boolean)
    .join("\n");
}

function sourceText(source: Source) {
  if ("title" in source) return taskMemoryText(source);

  return noteMemoryText(source);
}

function sourceTitle(source: Source) {
  if ("title" in source) return source.title;
  if ("kind" in source) return `${source.kind} note`;

  return "memory";
}

function chunkText(text: string) {
  const normalized = text.trim();
  if (!normalized) return [{ index: 0, text: "<empty>" }];

  const chunks = [];
  let start = 0;
  while (start < normalized.length) {
    const hardEnd = Math.min(start + CHUNK_TARGET_CHARS, normalized.length);
    const softEnd = normalized.lastIndexOf("\n\n", hardEnd);
    const end = softEnd > start + CHUNK_TARGET_CHARS / 2 ? softEnd : hardEnd;
    chunks.push({
      index: chunks.length,
      text: normalized.slice(start, end).trim(),
    });
    if (end >= normalized.length) break;
    start = Math.max(end - CHUNK_OVERLAP_CHARS, 0);
  }

  return chunks;
}

async function embedChunks(chunks: SourceChunk[]) {
  return await embedMany({
    model: embeddingModel(),
    providerOptions: embeddingOptions(),
    values: chunks.map((chunk) => chunk.text),
  });
}

function chunkEmbeddings(chunks: SourceChunk[], embeddings: number[][]) {
  if (chunks.length !== embeddings.length) {
    throw new Error(
      `Expected ${chunks.length} embeddings but received ${embeddings.length}`,
    );
  }

  return chunks.map((chunk, index) => {
    const embedding = embeddings.at(index);
    if (embedding === undefined) {
      throw new Error(`Missing embedding for chunk ${index}`);
    }

    return {
      chunkIndex: chunk.index,
      embedding,
    };
  });
}

async function indexNoteSource(
  ctx: ActionCtx,
  note: Doc<"notes">,
  projectId: Id<"projects">,
) {
  const chunks = chunkText(sourceText(note));
  const { embeddings, usage } = await embedChunks(chunks);
  await ctx.runMutation(internal.memorySources.replaceSourceEmbeddings, {
    chunks: chunkEmbeddings(chunks, embeddings),
    dimensions: EMBEDDING_DIMENSIONS,
    model: EMBEDDING_MODEL,
    noteId: note._id,
    projectId,
    sourceType: "note",
    sourceUpdatedAt: note.updatedAt,
  });

  return { chunks: chunks.length, usage };
}

async function indexTaskSource(ctx: ActionCtx, task: Doc<"tasks">) {
  const chunks = chunkText(sourceText(task));
  const { embeddings, usage } = await embedChunks(chunks);
  await ctx.runMutation(internal.memorySources.replaceSourceEmbeddings, {
    chunks: chunkEmbeddings(chunks, embeddings),
    dimensions: EMBEDDING_DIMENSIONS,
    model: EMBEDDING_MODEL,
    projectId: task.projectId,
    sourceType: "task",
    sourceUpdatedAt: task.updatedAt,
    taskId: task._id,
  });

  return { chunks: chunks.length, usage };
}

export const indexNote = action({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const note = await ctx.runQuery(internal.memorySources.fetchNote, {
      noteId: args.noteId,
    });
    if (!note?.projectId) return { indexed: false, reason: "not_project_note" };

    const result = await indexNoteSource(ctx, note, note.projectId);
    return { indexed: true, ...result };
  },
});

export const indexTask = action({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(internal.memorySources.fetchTask, {
      taskId: args.taskId,
    });
    if (!task) return { indexed: false, reason: "missing_task" };

    const result = await indexTaskSource(ctx, task);
    return { indexed: true, ...result };
  },
});

export const indexProject = action({
  args: { projectId: v.id("projects"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const sources = projectSources(
      await ctx.runQuery(internal.memorySources.fetchProjectSources, args),
    );
    const indexed = [];

    for (const note of sources.notes) {
      const result = await indexNoteSource(ctx, note, args.projectId);
      indexed.push({ result, sourceId: note._id, sourceType: "note" });
    }

    for (const task of sources.tasks) {
      const result = await indexTaskSource(ctx, task);
      indexed.push({ result, sourceId: task._id, sourceType: "task" });
    }

    return { indexed };
  },
});

export const ask = action({
  args: {
    projectId: v.id("projects"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 8, 1), 20);
    const queryEmbedding = await embed({
      model: embeddingModel(),
      providerOptions: embeddingOptions(),
      value: args.query,
    });
    const matches = await ctx.vectorSearch("memoryEmbeddings", "by_embedding", {
      filter: (q) => q.eq("projectId", args.projectId),
      limit,
      vector: queryEmbedding.embedding,
    });
    const sources = searchSources(
      await ctx.runQuery(internal.memorySources.fetchSearchResults, {
        ids: matches.map((match) => match._id),
      }),
    );

    return {
      embedding: {
        dimensions: EMBEDDING_DIMENSIONS,
        model: EMBEDDING_MODEL,
      },
      results: sources.map((source) => {
        const match = matches.find((item) => item._id === source.embedding._id);
        const text = sourceText(source.source);
        const chunks = chunkText(text);
        const chunk = chunks[source.embedding.chunkIndex] ?? {
          index: source.embedding.chunkIndex,
          text: "",
        };

        return {
          chunk,
          score: match?._score,
          source: {
            id: source.source._id,
            title: sourceTitle(source.source),
            type: source.embedding.sourceType,
            updatedAt: source.source.updatedAt,
          },
        };
      }),
      usage: queryEmbedding.usage,
    };
  },
});
