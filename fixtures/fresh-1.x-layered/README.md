# fresh-1.x-layered

Hand-written Fresh **1.7.3** fixture for the `fresh-dev` static analyzer.
Nothing here is meant to be run; every file is valid TS/TSX that a real Fresh
1.7.3 app would accept, kept as small as possible.

It covers the 1.x shapes (`fresh.gen.ts` manifest, `(req, ctx)` handlers,
`ctx.render(data)`, `Handlers<Data>` / `PageProps<Data>`), nested layouts,
nested middleware (function and array), a route group with a colocated
`(_islands)` folder, an island in a subdirectory, `[...rest]`, `[[optional]]`,
`routeOverride`, the tailwind plugin, and **deliberate defects**: a manifest
that is out of sync with the disk, a `handlers` export, a `Date` island prop, an
island reaching `Deno.env`, a clicky component, and a `static/styles.css` that
contains compiled CSS instead of the tailwind directives.

`EXPECTED.md` lists every fact the test-suite asserts. Do not "fix" the broken
files or regenerate `fresh.gen.ts`: they are the positive cases for the rules.
