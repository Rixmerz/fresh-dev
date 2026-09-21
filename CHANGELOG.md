# Changelog

## 0.1.0 — 2026-09-20

First release, implementing `docs/PLAN_FRESH_DEV.md` phases 1–9.

- Fresh MCP server (`fresh`, Deno): detection of Fresh 1.7.x / 2.3.x (Vite and builder),
  incremental index, route table with Fresh's `pathToPattern` and registration order,
  islands with 1.x/2.x naming rules and props serialisability, import graph with import-map
  resolution, JSX render/hydrate edges, server/client boundaries with violation chains,
  request tracing (`URLPattern`), impact analysis, Graphify-compatible export for livespec.
- 13 tools; `workspace` required on every call.
- Validator catalogue R001–R020, I001–I008, B001–B004, D001–D007, C001–C009 (+ C008 when
  merging `deno lint`), with a headless CLI and CI exit codes.
- 8 knowledge skills, 6 user commands, shared references (tools, versions, rules).
- Hooks: detect (SessionStart/CwdChanged/DirectoryAdded), invalidate (PostToolUse/FileChanged,
  plus `mcp_tool` reindex), validate (PostToolUse feedback). All fail open.
- `.lsp.json` for `deno lsp`; vise recipes and `integrations/` config snippets; livespec
  `.livespec.toml` snippet; evals.
- Fixtures: `fresh-1.x-layered`, `fresh-2.x-basic`, `fresh-2.x-builder`, `fresh-2.x-layered`,
  `not-fresh`, each with `EXPECTED.md`. All are minimal and purpose-built: this is a tool for
  Fresh as a framework, so it ships no application or component templates.
