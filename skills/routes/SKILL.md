---
name: routes
description: >-
  Route table of the Fresh project (pattern, kind, methods, layouts, middleware, islands) filtered by prefix or kind, or the trace of one URL to the route and chain that serve it. Read-only.
disable-model-invocation: true
argument-hint: "[prefix | kind | URL]"
---

Workspace: the absolute path of the current project (run `pwd` if unsure). Every fresh tool call takes `workspace`.

Tool names: `fresh_*` below is the tool suffix. The installed prefix depends on how the plugin was mounted (`mcp__plugin_fresh-dev_fresh__*` as a plugin, `mcp__fresh__*` by hand).

1. Classify `$ARGUMENTS` and call one tool:
   - empty: `fresh_routes` `{ workspace, limit: 100, offset: 0 }`.
   - one of `page`, `api`, `middleware`, `layout`, `special`: `fresh_routes` `{ workspace, kind }`.
   - a URL (contains `://`, `?` or `#`, or is preceded by `--trace`): `fresh_trace` `{ workspace, path: <path plus query only>, method: "GET" }`. Use the method the user wrote if any (`POST /api/x`).
   - anything else starting with `/`: `fresh_routes` `{ workspace, prefix: "$ARGUMENTS" }`. If the result lists no routes, also call `fresh_trace` with the same path so the answer says which route (or which `_404`/`_error`) serves it today.
   - anything else: say the argument was not understood, show the three forms above, and stop.
2. For a route listing print one table in the tool's order, columns `pattern | kind | methods | layouts | middlewares | islands`. Join arrays with `,`, print `-` when empty, and add the `file` after the pattern when two rows would otherwise look alike. If the response has `truncated: true`, say so, print `next_offset`, and offer to continue with `offset`.
3. For a trace print: `matched` (route, pattern, params); `chain[]` in execution order with the scope of each layout and middleware; `islands[]` hydrated; `staticMatch` when a static file wins (1.x: `static/` always wins; 2.x: it depends on where `staticFiles()` sits in `app.use`); `notFound` with the `_404`/`_error` that applies; `partials` when present.
4. Mark every entry with `confidence: inferred` as inferred (for example a non-literal `routeOverride`).
5. Do not edit anything.
