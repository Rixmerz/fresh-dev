# fresh-dev

Deno **Fresh** specialist plugin for Claude Code. It knows Fresh — routes, islands,
components, middleware, layouts, server/client boundaries, the chain a request goes
through — and hands that knowledge to the agents that do the work.

```
Claude Code
    │
 fresh-dev ── skills (how to reason about Fresh)
    │      ── fresh MCP (read-only semantic analysis, 13 tools)
    │      ── validators (~40 rules, also a headless CLI for CI / vise gates)
    │      ── hooks (detect the project, keep the index fresh, feedback after edits)
    │      ── deno lsp wiring
    ▼
 Fresh project ──► livespec (symbol graph) via .fresh-dev/graph.json
```

Principle: **fresh-dev knows Fresh; [vise](https://github.com/Rixmerz/vise) knows how to
orchestrate agents; [livespec](https://github.com/Rixmerz/livespec) knows the whole
system.** fresh-dev ships no agents of its own: vise's `frontend` /
`backend-typescript` agents load the `fresh-dev:*` skills when the orchestrator names
them in a brief.

Supports **Fresh 2.3.x** (Vite and builder modes) and **Fresh 1.7.x** (manifest).

## Install

Requirements: Claude Code, [Deno 2](https://docs.deno.com/runtime/getting_started/installation/) on PATH.

```sh
claude plugin marketplace add Rixmerz/claude-plugins
claude plugin install fresh-dev@rixmerz
```

From a clone (development):

```sh
git clone https://github.com/Rixmerz/fresh-dev && cd fresh-dev
claude plugin marketplace add ./          # registers the local "fresh-dev-local" marketplace
claude plugin install fresh-dev@fresh-dev-local
```

The first MCP start runs `deno cache` for the server's dependencies (needs network
once). Restart Claude Code after installing.

If you also have the official `typescript-lsp` plugin, two plugins claim `.ts`/`.tsx`
and Claude Code does not arbitrate; on Deno projects only `deno lsp` resolves
`fresh`, `jsr:` and `$fresh/` imports. Disable one of them.

## What you get

### MCP server `fresh` (13 read-only tools)

Every tool takes `workspace` — the absolute project root — on every call (no cwd
fallback, same convention as livespec). Installed as a plugin the tools appear as
`mcp__plugin_fresh-dev_fresh__<tool>`.

| Tool | Answers |
|---|---|
| `fresh_project` | Is this Fresh? Which version/flavor, entry files, counts, index status |
| `fresh_routes` | Route table: pattern, kind, methods, layouts, middlewares, islands |
| `fresh_route` | One route: full chain, data flow, renders, hydrated islands, imports, boundary, tests |
| `fresh_islands` | Islands with registered names, props serialisability, client closure, violations |
| `fresh_components` | Components, who renders them, boundary, unused ones |
| `fresh_dependencies` | Import graph slice (import map applied), externals, unresolved |
| `fresh_usages` | Where a file/export is imported and rendered (incl. through barrels) |
| `fresh_impact` | Routes/islands/wrappers affected by changed files or a git ref, plus the checks to run |
| `fresh_trace` | Which route serves a URL, middlewares in order, layouts, islands, static match, 404 |
| `fresh_boundaries` | server / client / shared classification and violations with import chains |
| `fresh_validate` | The rule catalogue (+ optional `deno lint` / `deno check` merge) → `ok`, findings |
| `fresh_graph_export` | Graphify-compatible `graph.json` for livespec `ingest_external_graph` |
| `fresh_reindex` | Rebuild the incremental index |

### Skills

Knowledge skills (loaded automatically by path or description):
`fresh-development`, `fresh-routing`, `fresh-islands`, `fresh-components`,
`fresh-data-flow`, `fresh-middleware`, `fresh-architecture`, `fresh-debugging`.

User commands: `/fresh-dev:init`, `/fresh-dev:analyze`, `/fresh-dev:routes`,
`/fresh-dev:impact`, `/fresh-dev:validate`, `/fresh-dev:debug`.

### Validators

Rules `R*` (routes), `I*` (islands), `B*` (boundaries), `D*` (dependencies), `C*`
(conventions) — see `skills/_shared/references/rules.md`. Also a headless CLI:

```sh
bin/fresh-mcp validate /abs/project            # exit 0 ok · 1 errors · 2 not Fresh · 3 internal
bin/fresh-mcp trace /abs/project --path /blog/hello
bin/fresh-mcp impact /abs/project --base main
bin/fresh-mcp export /abs/project              # → .fresh-dev/graph.json for livespec
bin/fresh-mcp rules
```

### Hooks

| Event | Does |
|---|---|
| `SessionStart`, `CwdChanged`, `DirectoryAdded` | says once that this is a Fresh project and how to work in it; silent otherwise |
| `PostToolUse` Edit/Write under `routes/`, `islands/`, `components/`, config files | marks the index dirty, reindexes (via `mcp_tool`), runs the fast rules for that file and hands back ≤ 8 lines |
| `PostToolUse` Bash (git checkout/pull/merge…), `FileChanged` on `deno.json`/`fresh.gen.ts`/`vite.config.ts` | marks the index dirty |

All hooks fail open (exit 0). Kill switch: `FRESH_DEV_HOOKS=off`.

### With vise

`/fresh-dev:init` proposes (never writes without a yes): `.vise/recipes/fresh-*.yaml`
(read-only consultation plans with `x.fresh.*` capabilities), `.vise/capabilities.yaml`
(bindings `fresh.fresh_* → x.fresh.*`), `.vise/quality.yaml` with `types: deno check`,
`lint: deno lint`, `fresh: fresh-mcp validate` so a workflow node can gate on the check
name `fresh`.

### With livespec

```sh
bin/fresh-mcp export /abs/project
# .livespec.toml
[graph]
external = ".fresh-dev/graph.json"
auto_ingest = true
```

Render/hydrate/wrap/guard edges become `uses_component` / `uses` edges in livespec's
symbol graph, so `who_calls(Page)` shows its layout and `analyze_impact(_middleware)`
reaches the routes under it. Route patterns and boundaries stay in fresh-dev (livespec
has no model for them).

## Layout

```
.claude-plugin/   plugin.json, marketplace.json (local dev marketplace)
.mcp.json .lsp.json
bin/              fresh-dev-run (launcher), fresh-mcp (CLI)
mcp/              the server: core/ (detect, parse, resolve, routes, islands, graph, boundaries, trace, impact, export, index), validators/, tools/, tests/
skills/           8 knowledge skills + 6 user commands + _shared/references
hooks/            hooks.json + detect_fresh.ts, invalidate_graph.ts, validate_fresh.ts
recipes/ templates/ evals/ agents/README.md
fixtures/         Fresh 1.7.3 apps, 1.x/2.x layered fixtures with EXPECTED.md, not-fresh
docs/             PLAN_FRESH_DEV.md (the plan, Spanish), research/
```

## Development

```sh
cd mcp
deno task check      # fmt --check, lint, deno check
deno task test       # fixture-based suite (routes, islands, boundaries, validators, traces, CLI, MCP round-trip)
deno task cli validate ../fixtures/fresh-2.x-layered
npx @modelcontextprotocol/inspector deno run -A main.ts --stdio
```

Footprint in analysed projects: `<workspace>/.fresh-dev/` (index cache, dirty marker,
`graph.json`, `warnings.jsonl`). Add it to `.gitignore`; nothing else is ever written.

## License

MIT
