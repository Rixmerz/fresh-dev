---
name: init
description: >-
  Detect the Fresh project, build the fresh-dev index, and propose the vise, livespec and gitignore snippets that wire fresh-dev into its neighbours. Proposes only; writes nothing without an explicit yes. Arg: optional workspace path.
disable-model-invocation: true
argument-hint: "[workspace]"
---

Workspace: `$0` if given, otherwise the absolute path of the current project (run `pwd`). Every fresh tool call takes `workspace` as that absolute path.

Tool names: the fresh MCP exposes `fresh_project`, `fresh_reindex` and the other `fresh_*` tools. The installed prefix depends on how the plugin was mounted (`mcp__plugin_fresh-dev_fresh__fresh_project` as a plugin, `mcp__fresh__fresh_project` when mounted by hand). Use whichever prefix your tool list shows; the suffix is always the name used below.

1. Call `fresh_project` with `{ workspace }`.
   - If the result is `ok: false` or says the project is not Fresh, print which signal was missing (no `deno.json`/`deno.jsonc`; no Fresh specifier in `imports`: `$fresh/` for 1.x, `fresh` or `@fresh/core` for 2.x; no `routes/` directory), quoting the tool's `error` and `hint`, then stop. Create nothing.
   - Otherwise print one block: Fresh version and flavor (1.x, 2.x vite, 2.x builder), counts of routes/islands/components/middlewares/layouts, `deno --version`, index state, and `apps[]` when the workspace is a Deno workspace with several apps.
2. Call `fresh_reindex` with `{ workspace, force: false }` and print `files`, `parsed`, `reused`, `ms`.
3. Detect neighbours by footprint with `ls`, never by guessing: `.vise/` (vise), `.mcp-docs/docs.db` (livespec index), `.livespec.toml` (livespec config). Print one line per neighbour: present or absent.
4. Propose, do not write. For each item below read the template under `${CLAUDE_PLUGIN_ROOT}`, print the target path and the exact content, and ask for an explicit yes. Write a file only after that yes, one file per confirmation. Never overwrite an existing file: propose a merge with the missing keys only.
   - `.vise/recipes/fresh-*.yaml` from the six files in `${CLAUDE_PLUGIN_ROOT}/recipes/`. Only when `.vise/` exists; otherwise say in one line that the copy can happen once vise is set up.
   - `.vise/capabilities.yaml` from `${CLAUDE_PLUGIN_ROOT}/integrations/vise/capabilities.yaml` (binds `x.fresh.*` to `fresh.fresh_*`). If the file exists, propose appending only the `fresh.fresh_*` keys that are missing.
   - `.vise/quality.yaml` from `${CLAUDE_PLUGIN_ROOT}/integrations/vise/quality.fresh.yaml`, with `<ABS_PATH_TO_PLUGIN>` replaced by the absolute value of `${CLAUDE_PLUGIN_ROOT}` (`quality.yaml` does not expand variables). For 2.x add `vite.config.ts` to `types`. If the file exists, propose adding only the missing keys among `fresh`, `types`, `lint`, `fmt`, `unit`. Say that `deno` must be on the PATH of the vise server process, or use its absolute path (for example `~/.deno/bin/deno`).
   - `.livespec.toml` `[graph]` section from `${CLAUDE_PLUGIN_ROOT}/integrations/livespec/livespec.toml.snippet`. Only when a livespec footprint was found; otherwise mention it in one line.
   - `.gitignore` line from `${CLAUDE_PLUGIN_ROOT}/integrations/gitignore.snippet` (`.fresh-dev/`), unless Grep finds the pattern already.
5. Print these reminders, in this order:
   - Hooks are already active for this plugin, nothing to enable: `detect-fresh` (SessionStart, CwdChanged, DirectoryAdded), `invalidate-graph` and `validate-fresh` (after Edit/Write under `routes/`, `islands/`, `components/` and on the config files). They never block. Kill switch: `FRESH_DEV_HOOKS=off`.
   - Command namespace: `/fresh-dev:init`, `/fresh-dev:analyze`, `/fresh-dev:routes`, `/fresh-dev:impact`, `/fresh-dev:validate`, `/fresh-dev:debug`.
   - Knowledge skills to name in briefs to vise subagents (they do not load them on their own): `fresh-dev:fresh-development`, `fresh-dev:fresh-routing`, `fresh-dev:fresh-islands`, `fresh-dev:fresh-components`, `fresh-dev:fresh-data-flow`, `fresh-dev:fresh-middleware`, `fresh-dev:fresh-architecture`, `fresh-dev:fresh-debugging`.
   - LSP conflict: if the `typescript-lsp` plugin is also installed, two plugins claim `.ts`/`.tsx` and Claude Code does not arbitrate between them. Disable one of the two; `vise doctor` reports the double claim.
6. Do not edit any source file. The only writes this skill may perform are the proposed files, each after its own explicit yes.
