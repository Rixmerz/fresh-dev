# fresh-2.x-layered

Hand-written Fresh **2.3.x (Vite mode)** fixture for the `fresh-dev` static
analyzer. Nothing here is meant to be run; every file is valid TS/TSX that a
real Fresh 2.3.3 app would accept, kept as small as possible.

It covers nested layouts, nested middleware (file-based and `app.use`), route
groups, `[...rest]`, `[[optional]]`, `routeOverride`, the `css` export,
partials, a mounted sub-app, colocated `(_islands)`/`(_components)`, islands
with named exports, and a set of **deliberate defects** under `routes/broken/`,
`routes/legacy-mw/`, `islands/` and `components/` that the validators must
report.

`EXPECTED.md` lists every fact the test-suite asserts. Do not "fix" the broken
files: they are the positive cases for the validator rules.
