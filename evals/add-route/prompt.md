---
name: add-route
tags: [skill:fresh-routing, tool:fresh_routes, write]
runs: 3
max_turns: 15
---
The working project is the Fresh 2.x app at `fixtures/fresh-2.x-basic` (relative to
the plugin root; use its absolute path as `workspace` for every fresh tool).

Add a `/pricing` page to this project. It should render a heading "Pricing" and reuse
the existing `Button` component for a "Contact sales" call to action. Before creating
any file, make sure no existing route already serves `/pricing`. Finish with one line
that says which file you created and which route pattern it produces.
