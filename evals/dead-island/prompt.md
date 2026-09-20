---
name: dead-island
tags: [skill:fresh-debugging, tool:fresh_islands, read-only]
runs: 3
max_turns: 10
---
The working project is the Fresh 2.x app at `fixtures/fresh-2.x-basic` (relative to
the plugin root; use its absolute path as `workspace` for every fresh tool).

I added an `onClick` handler to a component under `components/` and rendered it
directly from `routes/index.tsx`. In the browser nothing happens when I click it.
Diagnose why, using the fresh tools, and name the fresh-dev rule ID that covers this.
Do not edit any file.
