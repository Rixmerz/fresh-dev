# agents/

This directory is intentionally empty.

fresh-dev ships no agents (plan §2.3 and §8). It answers Fresh questions through the
`fresh` MCP tools and teaches how to reason about routes, islands, components, data
flow, middleware and boundaries through its knowledge skills. Orchestration belongs
to vise, whose fleet (`vise:frontend`, `vise:backend-typescript`) already covers a
Fresh codebase; a second agent would only duplicate it.

How a vise orchestrator briefs `vise:frontend` for Fresh work:

1. Name the skills explicitly; subagents do not load plugin skills on their own:
   "Load the fresh-dev:fresh-islands skill before your first edit" (likewise
   `fresh-dev:fresh-development`, `fresh-routing`, `fresh-components`, `fresh-data-flow`,
   `fresh-middleware`, `fresh-architecture`, `fresh-debugging`).
2. Pass the workspace: every `fresh_*` tool needs `workspace=<absolute project root>`.
3. Paste facts, not prose: `fresh_route` / `fresh_impact` / `fresh_islands` output for the
   files in scope, as `path:line`, so the subagent starts from the graph.
4. State the validation to run before reporting: `fresh_validate` (matching categories),
   `deno check`, `deno lint`. The recipes under `recipes/` list the same consultations.
