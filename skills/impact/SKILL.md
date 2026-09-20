---
name: impact
description: >-
  Fresh-aware impact of a change — routes, islands, layouts and middleware affected, plus the checks to run. Args: files or a git ref.
disable-model-invocation: true
argument-hint: "<file ...> | <git-base-ref>"
---

Workspace: the absolute path of the current project (run `pwd` if unsure). Every fresh tool needs `workspace`.

Tool names: `fresh_impact` is the tool suffix. The installed prefix depends on how the plugin was mounted (`mcp__plugin_fresh-dev_fresh__fresh_impact` as a plugin, `mcp__fresh__fresh_impact` by hand).

1. Decide the input:
   - `$ARGUMENTS` empty: run `git diff --name-only` (working tree against HEAD). If that is empty too, say there is nothing to analyse and stop.
   - `$ARGUMENTS` looks like a git ref (no `/`-separated path with a file extension; for example `main`, `HEAD~3`, `origin/main`): call `fresh_impact` with `{ workspace, git: { base: "$ARGUMENTS" }, depth: 3 }`.
   - otherwise: call `fresh_impact` with `{ workspace, files: [...], depth: 3 }`, paths relative to the workspace (POSIX).
2. Report, in this order and nothing else:
   - affected routes, one per line as `pattern <- why` (`renders`, `wraps`, `guards` or the `imports` chain);
   - islands whose client bundle changes;
   - middleware and layouts touched, each with the routes under its scope;
   - `boundaryRisks[]`, each with its chain and signal;
   - `suggestedChecks` verbatim as runnable commands (`deno check ...`, `deno lint`, related tests, and `fresh_validate` categories as `/fresh-dev:validate <categories>`).
3. Mark entries with `confidence: inferred` as inferred.
4. If livespec tools are present (`git_diff_impact`, `analyze_impact`), add one line: run `git_diff_impact(base_ref=...)` for the symbol-level side (tests likely to break).
5. Do not edit anything.
