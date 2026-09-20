# Islands — reference (discovery, naming, closure, runtime)

Sources: `packages/fresh/src/dev/fs_crawl.ts`, `packages/fresh/src/build_cache.ts` (`IslandPreparer.prepare`), `packages/plugin-vite/src/{mod,utils,plugins/deno,plugins/verify_imports}.ts`, `1.7.3/src/server/fs_extract.ts`, `1.7.3/src/dev/mod.ts`; Fresh docs `concepts/islands`, `advanced/vite`, `advanced/builder`, `advanced/api-reference`, `advanced/environment-variables`, `concepts/static-files`.

## 1. Discovery

### 2.x (the Vite plugin and the Builder both call `crawlFsItem`)

- `islands/` (`islandsDir` for the Vite plugin, `islandDir` for `Builder`) is walked recursively, any depth, extensions `tsx, jsx, ts, js`, minus `ignore` (default: the test-file pattern `/[._]test\.(?:[tj]sx?|[mc][tj]s)$/`).
- Every `(_islands)` directory anywhere under `routes/` (I007 elsewhere).
- Explicit `islandSpecifiers: string[]` in `fresh({...})` (Vite) or `builder.registerIsland("jsr:@scope/pkg/Island.tsx")` (Builder): local paths, `file://`, `jsr:`, `npm:`, `https:` are all accepted (`specToName` handles each).
- The Vite dev server watches for added and removed island files (`client_snapshot.ts` `isIslandPath`).
- There is no glob-style `islands` config: `FreshViteConfig` has `islandsDir` (string), `routeDir`, `ignore: RegExp[]`, `islandSpecifiers: string[]`. There is no `island-*` file-prefix marker; location decides.

### 1.x

- `islands/` walked recursively plus `(_islands)` folders (the same `collect()` as routes, fresh source: src/dev/mod.ts); plugins can add islands via `Plugin.islands = { baseLocation, paths }`.
- Entries land in `fresh.gen.ts` `manifest.islands`; a new island file needs the manifest regenerated (R008).

## 2. Registration and naming

- **Every exported function in an island module is an island** (both versions). Multiple islands per file and named-export islands are supported; the docs' own "Countdown" example uses `export function Countdown()` imported as a named export.
- 2.x (`IslandPreparer.prepare`): `export default` is named after the file (`pathToExportName(basename)`: non-identifier characters → `_`); named exports keep their export name; names are deduped by `UniqueNamer`.
- 1.x (`fs_extract.ts`): `name = sanitizeIslandName(path relative to islands/, without extension)` (PascalCase; subdirectories become part of the name); `id = <name lowercased>_<export lowercased>`; HTML markers `<!--frsh-myisland_default:default:0-->`.
- Naming guidance (Fresh docs: islands): "The name of this file must be a PascalCase or kebab-case name of the island" — a convention, not enforced by the crawler.
- A file with no exported function registers nothing (I001).

## 3. The client closure

Only islands, what they import, and (2.x Vite) `client.ts` are bundled for the browser; `routes/`, `_app`, `_layout`, `_middleware`, `main.ts` run server-only (Fresh docs: islands; `deno lint` `fresh-server-event-handlers`).

- Static imports always enter the bundle. A dynamic `import()` behind an `IS_BROWSER` guard is marked `confidence: inferred` by `fresh_boundaries`.
- 2.x Vite builds two environments through `@deno/loader` `Workspace`: `platform: "node"` for SSR and `platform: "browser"` for the client (plugin-vite `src/plugins/deno.ts`). `checkImports` has one built-in rule for the client environment: `if (isBuiltin(id)) → { type: "error", message: "Node built-in modules cannot be imported in the browser." }`, printing the importer chain (plugin-vite `src/mod.ts`, `src/plugins/verify_imports.ts`). Users can add their own `checkImports: ImportCheck[]` — `(id, env: "server" | "client") => { type: "warn" | "error", message, description?, hint? } | void`.
- `Deno.*` globals, `jsr:@std/fs`, `@std/io`, DB clients, `Deno.env`, `Deno.readTextFile` are not caught by any rule; they fail at bundle or run time in the browser (`Deno is not defined`). `fresh_boundaries`, B001 and I003 flag them statically with the chain `island → … → module`. `@std/path` is isomorphic and is not a signal.
- `FRESH_PUBLIC_*` env vars are inlined into island bundles at build time only when written literally as `Deno.env.get("FRESH_PUBLIC_X")` or `process.env.FRESH_PUBLIC_X` (Fresh docs: environment-variables). Any other `Deno.env` access in an island is a server signal.
- A barrel (`components/index.ts` re-exporting from `islands/`) hides the direct import; the JSX use is attributed with `confidence: inferred` (I005) and can pull whole folders into the closure (I006). Import islands and components by file.
- `fresh_islands(...).clientClosure` reports the file count and size; `fresh_dependencies(file=..., depth=3)` shows the chain.

## 4. Runtime imports inside islands

- 2.x: `import { IS_BROWSER, asset, assetSrcSet, Head, Partial, HttpError } from "fresh/runtime";` — `IS_BROWSER = typeof document !== "undefined"` (fresh source: runtime/shared.ts). `fresh/runtime` is documented as "Safe to import in islands" (Fresh docs: api-reference). Hooks and signals: `import { useSignal, signal, computed } from "@preact/signals"`, `import { useEffect, useState } from "preact/hooks"`.
- 1.x: `import { IS_BROWSER, asset, Head, Partial, useCSP } from "$fresh/runtime.ts";`.
- Importing `IS_BROWSER` from the other version's specifier is B003.
- Browser-only APIs (`window`, `document`, `EventSource`, `navigator`, `customElements`) must be guarded with `IS_BROWSER` or run inside `useEffect`, because islands are also rendered on the server (Fresh docs: islands, both versions) — I008.

## 5. Signals across the boundary

- 2.x: a Preact `Signal` prop is serialized via `.peek()` and revived as a new `signal()`; shared signal instances are preserved; computed signals serialize to their static value.
- 1.x: `Signal` is in the accepted list too.
- A signal created in a route (`useSignal(3)` in the scaffold's `routes/index.tsx`) and passed as `<Counter count={count} />` is the canonical way to share state between the server-rendered page and an island, or between sibling islands.
- Nested islands work in both versions; the inner island's props are serialized as well.

## 6. `<Head>`, `asset()`, partials from an island

- 2.x `<Head>` from `fresh/runtime` works in routes and islands, deduping `<title>`, `key`, `id`, `meta[name]`, `link[rel]` (Fresh docs: advanced/head). 1.x: `Head` from `$fresh/runtime.ts`.
- `asset("/x.pdf")` appends `__frsh_c=BUILD_ID`; `<img>`/`<source>` `src`/`srcset` are auto-locked unless `data-fresh-disable-lock`.
- `<Partial name mode>`, `f-client-nav` and `f-partial` are described in `../../fresh-data-flow/references/data-flow-2x.md` §7 (2.x) and `data-flow-1x.md` §7 (1.x).

## 7. Serving the island JS

2.x: `app.use(staticFiles())` in `main.ts` is required or island JS is not served (Fresh docs: file-routing) — R020. 1.x serves `static/` and the island bundle automatically.

## Validator IDs that apply here

I001–I008, B001, B003, R008, R018, R020 — see `../../_shared/references/rules.md`.
