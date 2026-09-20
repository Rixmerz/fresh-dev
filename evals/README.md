# evals/

Behavioural checks for the fresh-dev skills and hooks, run with the Claude Code
plugin evaluator from the plugin root:

    claude plugin eval .

Layout (one directory per case):

    evals/<case>/prompt.md        frontmatter: name, tags, runs, max_turns; body: the prompt
    evals/<case>/graders/*.md     frontmatter: type (regex | tool_used | tool_order | llm)
                                  plus that grader's options; body: the rubric for llm graders

Every prompt names `fixtures/fresh-2.x-basic` (a clean `jsr:@fresh/init` project, relative
to the plugin root) as the working project. Tool names in `tool_used` and `tool_order`
graders are the `fresh_*` suffixes; the installed MCP prefix
(`mcp__plugin_fresh-dev_fresh__` or `mcp__fresh__`) is not part of the match. If your
Claude Code version requires the full name, prefix the values in the grader files.

Cases:

| case             | checks                                                            |
|------------------|-------------------------------------------------------------------|
| add-route        | `fresh_routes` called, and before `Write`; conflicting route checked (llm) |
| dead-island      | `fresh_islands` called; answer names I003 or I004                  |
| validate-project | `fresh_validate` called; answer ends with ok / not ok              |
| session-detect   | first assistant message names the Fresh version (SessionStart hook) |

Notes:

- `runs: 3` per case; the initial pass threshold is 0.8 (plan §13). Evals consume
  tokens, so CI runs them only on `workflow_dispatch`.
- `add-route` writes a route file into the fixture. Run on a clean tree and discard the
  fixture changes afterwards.
- `evals/results/` is written by the evaluator and is gitignored.
