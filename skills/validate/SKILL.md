---
name: validate
description: >-
  Run the fresh-dev structural validators (routes, islands, boundaries, dependencies, conventions), print findings grouped by severity, and end with ok or not ok plus the equivalent CI command. Args: categories, and --deno to merge deno lint and deno check.
disable-model-invocation: true
argument-hint: "[category ...] [--deno]"
---

Workspace: the absolute path of the current project (run `pwd` if unsure). Every fresh tool call takes `workspace`.

Tool names: `fresh_validate` is the tool suffix. The installed prefix depends on how the plugin was mounted (`mcp__plugin_fresh-dev_fresh__fresh_validate` as a plugin, `mcp__fresh__fresh_validate` by hand).

1. Parse `$ARGUMENTS`: every token must be one of `routes`, `islands`, `boundaries`, `dependencies`, `conventions`, or the flag `--deno`. On an unknown token print the accepted list and stop.
2. Call `fresh_validate` with `{ workspace, categories: [<tokens>] }`; omit `categories` when none was given (all categories). With `--deno` add `external: { deno_lint: true, deno_check: true }` and say the run takes longer because `deno lint --json` and `deno check` execute.
3. Print the findings grouped by severity: errors, then warnings, then info. One line each: `ID file:line:col message -- hint`. Append `[inferred]` when `confidence` is `inferred`, and `[deno lint]` or `[deno check]` when `source` says so. Findings the tool flags as false positives (for example C008) go under info with that note.
4. Print `summary`: counts of errors, warnings and info, then `unverified[]` file by file. A file the validator could not parse is reported, never treated as clean.
5. End with exactly `ok` or `not ok` (`ok` means no error-severity finding), followed by the equivalent command for CI:
   `fresh-mcp validate <workspace> --json [--category <c> ...] [--deno-lint] [--deno-check]`
   (`bin/fresh-mcp` is on PATH inside Claude Code; elsewhere use `deno run -A ${CLAUDE_PLUGIN_ROOT}/mcp/cli.ts validate <workspace> --json ...`). Exit codes: 0 ok, 1 error-severity findings, 2 not a Fresh project, 3 internal error.
6. Do not edit anything and do not fix findings. The user decides what to change after reading the report.
