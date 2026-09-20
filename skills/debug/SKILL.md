---
name: debug
description: >-
  Diagnose a Fresh symptom or URL — 404s, dead islands, hydration, styles, stale manifest — with fresh_trace, fresh_islands and fresh_validate, then report the cause and the minimal fix without editing. Arg: the symptom or URL.
disable-model-invocation: true
argument-hint: "<symptom or URL>"
---

Load the fresh-dev:fresh-debugging skill first. It holds the symptom tree and the rule IDs used below.

Workspace: the absolute path of the current project (run `pwd` if unsure). Every fresh tool call takes `workspace`.

Tool names: `fresh_*` below is the tool suffix. The installed prefix depends on how the plugin was mounted (`mcp__plugin_fresh-dev_fresh__*` as a plugin, `mcp__fresh__*` by hand).

1. Classify `$ARGUMENTS` and run the matching query:
   - a URL or path (starts with `/` or `http`): `fresh_trace` `{ workspace, path, method }` (`GET` unless the user wrote another). Read `matched`, `chain[]`, `staticMatch`, `notFound`.
   - names an island (a PascalCase name, or a file under `islands/` or `(_islands)/`): `fresh_islands` `{ workspace, name }`. If `violations` is not empty, also `fresh_boundaries` `{ workspace, only_violations: true }`.
   - names a route file (under `routes/`): `fresh_route` `{ workspace, file }`.
   - otherwise follow the symptom tree:
     - "404", "wrong page", "URL served by another route": ask for the URL if missing, then `fresh_trace`.
     - "not interactive", "onClick does nothing", "island dead", "no hydration": `fresh_islands` `{ workspace, summary_only: true }`, then `fresh_validate` `{ workspace, categories: ["islands", "boundaries"] }` (I003, I004, I008, B001).
     - "styles not applied", "tailwind": `fresh_validate` `{ workspace, categories: ["conventions"] }` (C003 for 1.x, C004 and C009 for 2.x).
     - "new route file is ignored", "manifest" (1.x): `fresh_validate` `{ workspace, categories: ["routes"] }` (R008, fix is `deno task manifest`).
     - "type error", "cannot find module": `fresh_validate` `{ workspace, categories: ["dependencies"] }` (D001 to D005), then suggest `deno check <file>`.
     - "AddrInUse", "island JS returns 404" (2.x): `fresh_validate` `{ workspace, categories: ["routes"] }` (R017, R020).
   - Use Read or Grep only to confirm a specific line a tool pointed at. Do not scan the project by hand.
2. Print, in this order: the facts observed (tool output as `file:line`, the chain, the rule IDs); the most likely cause in one sentence; the minimal fix as a proposal (file, what changes, why); how to verify it (`fresh_validate` categories, `deno check`, the URL to retry). Mark inferred facts as inferred.
3. If livespec tools are present, add one line suggesting `who_calls` or `analyze_impact` on the symbol involved.
4. Never edit anything. If the user wants the fix applied, they ask after reading the proposal.
