---
name: validate-project
tags: [skill:validate, tool:fresh_validate, read-only]
runs: 3
max_turns: 8
---
The working project is the Fresh 2.x app at `fixtures/fresh-2.x-basic` (relative to
the plugin root; use its absolute path as `workspace` for every fresh tool).

Run the fresh-dev structural validation on this project. Report the findings grouped
by severity and end with a single line that says `ok` or `not ok`.
