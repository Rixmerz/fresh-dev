# Fresh project anatomy — 1.x vs 2.x

Source-checked against `denoland/fresh` (`main` for 2.3.x, tag `1.7.3`) and
projects generated with `jsr:@fresh/init` / `fresh@1.7.3/init.ts`. See also
`../../_shared/references/versions.md`.

## Fresh 2.x, Vite mode (default of `deno run -Ar jsr:@fresh/init`)

```
deno.json          "fresh": "jsr:@fresh/core@^2.3.x", "@fresh/plugin-vite", "vite",
                   "preact": "npm:preact@^10", "@preact/signals": "npm:…", "@/": "./"
                   tasks: dev=vite, build=vite build, start=deno serve -A _fresh/server.js
                   compilerOptions.jsx="precompile", jsxImportSource="preact", types=["vite/client"]
                   nodeModulesDir="manual", lint.rules.tags=["fresh","recommended"]
main.ts            export const app = new App<State>(); app.use(staticFiles()); … app.fsRoutes();
                   NO app.listen() — `deno serve` runs the built server (R017)
utils.ts           export const define = createDefine<State>()
vite.config.ts     defineConfig({ plugins: [fresh()] })   ← from "@fresh/plugin-vite"
client.ts          import "./assets/styles.css"           ← client entry; imported assets live in assets/
assets/            files imported from code (CSS, fonts)
static/            files referenced by URL (served by staticFiles())
routes/            file-system routes (fsRoutes)
islands/           client components; also routes/**/(_islands)/
components/        server-rendered components (any folder works; (_components)/ inside routes/ too)
_fresh/            build output: server.js, server/, client/ (gitignored)
```

There is no `fresh.gen.ts`, no `fresh.config.ts`, no `dev.ts` in Vite mode.

## Fresh 2.x, builder mode (`--builder`)

Same as above minus Vite: `dev.ts` with `Builder` from `fresh/dev`
(`builder.listen(() => import("./main.ts"))`, `builder.build()`), no
`client.ts`, CSS in `static/` linked from `_app.tsx`. `Builder` options:
`root`, `outDir` (`_fresh`), `staticDir` (string | string[]), `islandDir`,
`routeDir`, `serverEntry`, `ignore`.

## Fresh 1.x (1.7.3)

```
deno.json          "$fresh/": "https://deno.land/x/fresh@1.7.3/", preact via esm.sh, "$std/"
                   tasks: start=deno run -A --watch=static/,routes/ dev.ts, build=deno run -A dev.ts build,
                          manifest=deno task cli manifest $(pwd)
                   compilerOptions.jsx="react-jsx", jsxImportSource="preact"
main.ts            import manifest from "./fresh.gen.ts"; await start(manifest, config)
dev.ts             await dev(import.meta.url, "./main.ts", config)   ← regenerates fresh.gen.ts
fresh.config.ts    defineConfig({ plugins: [tailwind()] })
fresh.gen.ts       generated manifest: routes{}, islands{}, baseUrl — checked in, never edited by hand
routes/ islands/ components/ static/
_fresh/            build output: snapshot.json, static/
```

`fresh.gen.ts` is the source of truth for routing in 1.x. A route file that is
not in the manifest is not served until `deno task manifest` runs (R008).

## Where new code goes

| Code | 2.x | 1.x |
|---|---|---|
| A page | `routes/<path>.tsx` (`define.page`) | `routes/<path>.tsx` (default export) |
| A JSON/API endpoint | `routes/<path>.ts` (`define.handlers`) | `routes/<path>.ts` (`handler: Handlers`) |
| Interactive UI | `islands/<Name>.tsx` or `routes/…/(_islands)/` | `islands/<Name>.tsx` |
| Shared server-rendered UI | `components/` or `routes/…/(_components)/` | `components/` |
| Request-scoped state, auth | `routes/**/_middleware.ts` or `app.use()` in `main.ts` | `routes/**/_middleware.ts` |
| Server-only logic (DB, env) | any module NOT imported from an island (`lib/`, `db/`) | same |
| Global middleware, programmatic routes | `main.ts` before `app.fsRoutes()` | plugins in `fresh.config.ts` |
| CSS | `assets/*.css` imported from `client.ts` (Vite) / `static/` (builder) | `static/styles.css` |

Ask `fresh_project` before assuming: it reports `flavor`, the entry files and
the directories actually present.
