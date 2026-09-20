# not-fresh

Negative control for the `fresh-dev` detector: a plain **Deno + Vite + Preact**
single-page app that is **not** a Fresh project.

It deliberately has a top-level `routes/` directory (a client-side route table)
to prove that a `routes/` folder on its own is not a Fresh signal, and it
imports `vite` and `preact` from `deno.json` so that those imports alone do not
trigger 2.x detection either. Nothing imports `fresh`, `@fresh/core`,
`@fresh/plugin-vite` or `$fresh/`; there is no `fresh.gen.ts`, no
`fresh.config.ts`, no `main.ts` with `new App()`.

Expected analyzer behaviour is in `EXPECTED.md`.
