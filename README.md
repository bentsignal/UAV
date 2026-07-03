# UAV

UAV is a local-first coordination system for coding agents. It provides a
small CLI, a local daemon boundary, and a Convex-backed shared database for
tracking projects, sessions, tasks, notes, events, and requests to evolve UAV
itself.

The CLI is the surface agents use from any repository. The Convex service is
the durable store. The UAV orchestrator, running from this repository, owns
authority-level decisions such as schema evolution and code changes.
