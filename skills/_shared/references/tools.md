# fresh MCP tools — the 13 calls, their arguments, what they return

Every tool takes `workspace`: the absolute path of the Fresh project root, the directory
that holds `deno.json`. There is no cwd or environment fallback; omitting it returns a
shaped error (same contract as livespec). All tools are read-only except
`fresh_graph_export`, which writes only under `<workspace>/.fresh-dev/`.

## Tool naming when installed

The bare names below are what the server registers. The host prefixes them according to
how the server was mounted:

| Installed as | Name seen by Claude |
|---|---|
| plugin `fresh-dev` (server key `fresh`) | `mcp__plugin_fresh-dev_fresh__<tool>` — the hyphen in `fresh-dev` may be normalised to `_`; read the real name from the tool list on first use |
| mounted by hand in `.mcp.json` under the key `fresh` | `mcp__fresh__<tool>` |

Never hardcode the prefix in a skill, a brief, an `allowed-tools` list or a recipe.
Refer to tools by their bare name; where a pattern is required use a wildcard such as
`mcp__*fresh*__*`.

## The table

| Tool | Required | Optional | Returns | Use it when |
|---|---|---|---|---|
| `fresh_project` | `workspace` | — | detection: `isFresh`, `version` (`"1"`/`"2"`/`null`), `flavor` (`1.x-manifest`/`2.x-vite`/`2.x-builder`/`unknown`), `freshVersion`, `preactSpecifier`, `dirs`, `entry` (`main, dev, client, config, utils`), `staticDirs`, `confidence`, `evidence[]`; counts (routes, islands, components, middlewares, layouts); tasks; `deno --version`; index state; `apps[]` when `deno.json` is a Deno workspace | first contact; before applying any version-specific rule |
| `fresh_routes` | `workspace` | `kind` (`page`\|`api`\|`middleware`\|`layout`\|`special`), `prefix`, `summary_only`, `limit=100`, `offset=0` | route table rows: `pattern, file, kind, methods, hasPage, group, layouts[], middlewares[], islands[], config` | site map; choosing where a new route goes; what a layout or middleware scope covers |
| `fresh_route` | `workspace` + `pattern` **or** `file` | — | one route: the chain `app → layouts → middlewares → handler → page`, `passes_data` (the `Data` type when literal), direct `renders`, `hydrates` (islands), direct imports, the file's `boundary`, `tests` that cite the pattern or file | before editing a route file |
| `fresh_islands` | `workspace` | `name`, `summary_only` | per island: `file, exports, props` (each with serializability), `usedBy` (routes and components), `clientClosure` (the local modules pulled into the browser bundle), `violations[]`; 2.x names come from Fresh's `UniqueNamer` (`Comments_1`), 1.x entries also carry `islandId` | adding or changing interactivity; checking what a prop or import change does to the client bundle |
| `fresh_components` | `workspace` | `name`, `only` (`server`\|`client`\|`shared`) | per component: `file, exports, usedBy, boundary, reachableFromIslands` | reuse before creating; deciding whether a component may be rendered by an island |
| `fresh_dependencies` | `workspace`, `file` | `direction` (`imports`\|`importers`, default `imports`), `depth=1`, `include_external=true` | resolved import subgraph (import map applied) with `external[]` entries (`specifier`, `kind` `jsr`\|`npm`\|`https`\|`node`) | what a file drags into a bundle; who imports a file |
| `fresh_usages` | `workspace`, `target` (`file` or `file::Export`) | — | `imports` (file, line) and `jsxUses` (file, line, prop names) | renaming or moving safely; complements LSP `findReferences`, which does not see a JSX use of an aliased import |
| `fresh_impact` | `workspace` + `files[]` **or** `git: {base, head?}` | `depth=3` | `routes[]` affected with the reason chain (`renders`/`wraps`/`guards`/`imports`), `islands[]` whose client bundle changes, middlewares and layouts touched with the routes under their scope, `boundaryRisks[]`, `suggestedChecks` | planning a change; writing a brief; reviewing a PR |
| `fresh_trace` | `workspace`, `path` (`/blog/hello?x=1`) | `method=GET` | `matched: {route, pattern, params}`, ordered `chain[]` (`app`, `layout`, `middleware` with scope, `handler`, `page`), `islands[]` hydrated, `staticMatch?`, `partials?`, `notFound?` (which `_404`/`_error` applies) | "why does this URL do X?"; proving a URL is free before adding a route |
| `fresh_boundaries` | `workspace` | `only_violations=true` | per-module `boundary` (`client-entry`/`client`/`shared`/`server`/`unknown` — reachability) and `nature` (`server-only`/`browser-only`/`isomorphic` — what the code needs), and violations, each with the chain `island → … → module` and the signal that caused it | before moving code between islands, components and server modules |
| `fresh_validate` | `workspace` | `categories[]` (`routes`\|`islands`\|`boundaries`\|`dependencies`\|`conventions`), `files[]`, `external: {deno_lint?, deno_check?}` (both default `false`) | `{ok, findings[{id, severity, category, file, line, col, message, hint, confidence}], summary{errors, warnings, info, unverified[]}}` | the gate after every edit; `ok` is `true` only with zero `error` findings |
| `fresh_graph_export` | `workspace` | `path=".fresh-dev/graph.json"`, `relations[]` | writes a Graphify node-link JSON; returns `{path, nodes, links, byRelation, livespecSnippet}` | feeding livespec (`ingest_external_graph`) |
| `fresh_reindex` | `workspace` | `force=false` | index stats: `files, parsed, reused, ms` | after edits made outside Claude Code (`git pull`, `deno task manifest`); hooks call it |

## Output conventions

- Success carries `ok: true`; failure is `{ok: false, error, hint, did_you_mean?}`.
- Paths are POSIX and relative to `workspace`. No full file contents; at most three lines
  of context per finding.
- Anything deduced rather than read is marked `confidence: "inferred"`: a `routeOverride`
  built from a non-literal expression, a lazily imported middleware, an island reached
  through a barrel, a dynamic `import()` behind an `IS_BROWSER` guard.
- Large results paginate: `summary_only`, `limit`/`offset`, `prefix`; `truncated: true`
  and `next_offset` when a page was cut. Aim below 16 KB per call (vise warns at 32 KB).
- `fresh_validate` never reports an unparsable file as clean: it appears in
  `summary.unverified[]`. Severity: `error` breaks at runtime or build, `warning` works but
  is fragile, `info` is style or architecture.
- `fresh_validate(external={deno_lint: true, deno_check: true})` runs `deno lint --json`
  (tag `fresh`) and `deno check` and merges their findings with `source: "deno lint"`.
  C008 marks the known false positive (`fresh-handler-export` on a 2.x `handlers` export).

## Example calls

```
fresh_project(workspace="/abs/path")
fresh_routes(workspace="/abs/path", prefix="/blog", summary_only=true)
fresh_routes(workspace="/abs/path", kind="middleware")
fresh_route(workspace="/abs/path", file="routes/blog/[slug].tsx")
fresh_route(workspace="/abs/path", pattern="/blog/:slug")
fresh_trace(workspace="/abs/path", path="/blog/hello-world", method="GET")
fresh_islands(workspace="/abs/path", name="LikeButton")
fresh_islands(workspace="/abs/path", summary_only=true)
fresh_components(workspace="/abs/path", only="shared")
fresh_usages(workspace="/abs/path", target="components/PostBody.tsx::PostBody")
fresh_dependencies(workspace="/abs/path", file="islands/LikeButton.tsx", depth=2)
fresh_dependencies(workspace="/abs/path", file="components/PostBody.tsx", direction="importers")
fresh_boundaries(workspace="/abs/path", only_violations=true)
fresh_impact(workspace="/abs/path", files=["components/PostBody.tsx"])
fresh_impact(workspace="/abs/path", git={base: "main"})
fresh_validate(workspace="/abs/path", categories=["routes", "islands"], files=["routes/blog/[slug].tsx"])
fresh_validate(workspace="/abs/path", external={deno_lint: true, deno_check: true})
fresh_graph_export(workspace="/abs/path")
fresh_reindex(workspace="/abs/path", force=true)
```

## Division of labour with the other tools in a session

| Question | Answer with | Why not the others |
|---|---|---|
| a symbol's definition, references, implementations, a file's outline, an inferred type | the `LSP` tool backed by `deno lsp` (`goToDefinition`, `findReferences`, `goToImplementation`, `documentSymbol`, `hover`); `deno lsp` reads `deno.json`, so `$fresh/`, `@/`, `jsr:`, `npm:` resolve | grep matches text; `typescript-language-server` cannot resolve `fresh`, `jsr:` or `$fresh/` |
| which file serves a URL, which layouts and middleware wrap it, which islands hydrate, a JSX use of an aliased import, the server/client boundary | `fresh_*` | the LSP has no notion of routes, scopes or JSX-by-name |
| type errors, lint findings | `deno check`, `deno lint` (tag `fresh`); `fresh_validate(external=...)` merges them | the `LSP` tool exposes navigation, not diagnostics |
| the call graph by symbol, dead code, Specs | livespec (`who_calls`, `analyze_impact`, `read_unit`, `search_similar`) when mounted | `fresh_*` works at file and JSX level only |
