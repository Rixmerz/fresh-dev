---
name: analyze
description: >-
  One-screen overview of the Fresh project — version, routes, islands, boundary violations and validator summary, with next steps. Read-only. Arg: --full to force a reindex, merge deno lint and deno check, and export the graph for livespec.
disable-model-invocation: true
argument-hint: "[--full]"
---

Workspace: the absolute path of the current project (run `pwd` if unsure). Every fresh tool call takes `workspace`.

Tool names: `fresh_*` below is the tool suffix. The installed prefix depends on how the plugin was mounted (`mcp__plugin_fresh-dev_fresh__*` as a plugin, `mcp__fresh__*` by hand). Use the one your tool list shows.

1. If `$ARGUMENTS` contains `--full`, call `fresh_reindex` with `{ workspace, force: true }` first. Otherwise skip it; the index is built on the first tool call.
2. Call, in this order, and keep every response as facts (`file:line`), not prose:
   - `fresh_project` `{ workspace }`. If the project is not Fresh, print the tool's `error` and `hint` and stop.
   - `fresh_routes` `{ workspace, summary_only: true }`
   - `fresh_islands` `{ workspace, summary_only: true }`
   - `fresh_boundaries` `{ workspace, only_violations: true }`
   - `fresh_validate` `{ workspace }`; with `--full` add `external: { deno_lint: true, deno_check: true }`.
   - With `--full` only: `fresh_graph_export` `{ workspace }` (writes `.fresh-dev/graph.json`). Print the returned `nodes`, `links` and `livespecSnippet`.
3. Print a report of at most 40 lines:
   - Header: version, flavor, counts (routes, islands, components, middlewares, layouts), index age.
   - Routes: count by kind (page, api, middleware, layout, special); whether route groups, catch-all or optional segments exist; the layouts and middleware with the widest scope.
   - Islands: count; the largest client closure (files, size); islands with non-empty `violations`.
   - Boundaries: one line per violation, `island -> ... -> module (signal)`; entries with `confidence: inferred` are marked inferred.
   - Validation: `errors / warnings / info`, then up to 5 error-severity findings as `ID file:line message`, then `unverified[]` when not empty.
   - Next steps: 3 to 5 concrete commands chosen from the findings above (`/fresh-dev:validate <categories>`, `/fresh-dev:routes <prefix>`, `/fresh-dev:impact <files>`, `/fresh-dev:debug <symptom>`, `deno check <files>`, `deno lint`).
4. Do not edit anything. Do not paste file contents; cite `file:line`.
