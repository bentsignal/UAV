# UAV

UAV is an agent-first project memory and work-tracking system for local
codebases. It is meant to replace lightweight Notion-style project pages with a
CLI and Convex-backed store that coding agents can use directly.

The core objects are projects, durable work items, notes, and project intent.
Work items cover tasks, bugs, ideas, chores, and larger goals, and they can be
split into child items when an agent breaks down a larger effort. Notes capture
knowledge that should live near the code without becoming a giant markdown file
or being injected into every prompt.

`uav ask` is the natural-language retrieval surface for project memory. UAV
stores derived embedding chunks in its own Convex `memoryEmbeddings` table using
OpenAI `text-embedding-3-large` embeddings at 1024 dimensions. The embedding
table stores vectors and source metadata only; notes and work items remain the
canonical source of text and structured data.

The CLI is the surface agents use from any repository. The Convex service is the
durable store for project memory, work items, notes, proposals, and derived
embeddings. The UAV orchestrator, running from this repository, owns
authority-level decisions such as schema evolution and code changes.
