# Fresh (Deno) static-analysis research report — for `fresh-mcp`

Scope: Fresh **2.3.x** (current stable; `@fresh/core@2.3.3`, `@fresh/plugin-vite@1.1.2`, `@fresh/init@2.3.3`, `@fresh/update@2.3.3`) and legacy **1.7.x** (`1.7.3` is the last 1.x tag in `versions.json`). Docs live at `https://usefresh.dev/docs/...` (2.x = repo `docs/latest/`) and `https://usefresh.dev/docs/1.x/...` (repo `docs/1.x/`); `fresh.deno.dev/docs/*` 307-redirects to `usefresh.dev` (observed).

How this was verified (beyond reading docs/source): I downloaded Deno 2.9.7 into a scratch dir and (a) ran `deno run -A -r jsr:@fresh/init demo2 --no-tailwind --vscode --no-docker` (Fresh 2.3.3) and `deno run -A -r https://raw.githubusercontent.com/denoland/fresh/1.7.3/init.ts demo1 ...` (Fresh 1.7.3), then inspected the generated files; (b) ran `deno info --json`, `deno check`, `deno lint`, `deno lint --rules` on both; (c) ran plain `tsc` 5.9.3 on the Fresh 2 project; (d) ran `@deno/loader@0.5.0` under Node 22 against the Fresh 2 project. Source quotes come from `raw.githubusercontent.com/denoland/fresh/main/...` (verified identical for the relevant APIs against the published `https://jsr.io/@fresh/core/2.3.3/src/...`) and the `1.7.3` tag. Items I could not verify are marked **UNVERIFIED**.

---

## 1. Project anatomy / detection signals

### 1.1 Fresh 2.3.3 — what `deno run -Ar jsr:@fresh/init` generates today (Vite mode, the default)

Init flags (from `packages/init/src/init.ts` / `create.ts`, https://raw.githubusercontent.com/denoland/fresh/main/packages/init/src/init.ts): `--force`, `--tailwind`, `--vscode`, `--docker`, `--builder` ("Setup with builder instead of vite"), `--help`. `const useVite = !flags.builder;` → **Vite is the default**. `@fresh/init` also exports `./create` so `deno create @fresh/init` works (`deno create` exists in Deno 2.9.7: "Create a project from a template"; JSR page https://jsr.io/@fresh/init lists `deno create @fresh/init`).

Version constants in init.ts: `FRESH_VERSION = "2.3.3"`, `FRESH_TAILWIND_VERSION = "1.0.0"`, `FRESH_VITE_PLUGIN = "1.1.2"`, `PREACT_VERSION = "10.29.1"`, `PREACT_SIGNALS_VERSION = "2.9.0"`, `TAILWINDCSS_VERSION = "4.1.10"`, `POSTCSS_VERSION = "8.5.6"`.

Files actually generated (observed, `--no-tailwind --vscode`):
```
.gitignore  .vscode/extensions.json  .vscode/settings.json  README.md
assets/styles.css   client.ts   components/Button.tsx   deno.json   deno.lock
islands/Counter.tsx main.ts     routes/_app.tsx  routes/api/[name].tsx  routes/index.tsx
static/favicon.ico  static/logo.svg   utils.ts   vite.config.ts
(+ node_modules/ because init runs `deno install`; + Dockerfile with --docker; + tailwind bits with --tailwind)
```
**There is no `fresh.gen.ts`, no `fresh.config.ts`, no `dev.ts` in a Vite-mode Fresh 2 project.** (With `--builder` there IS a `dev.ts` and no `vite.config.ts`/`client.ts`; see 1.3.)

Generated `deno.json` (verbatim, observed):
```json
{
  "nodeModulesDir": "manual",
  "tasks": {
    "check": "deno fmt --check . && deno lint . && deno check",
    "dev": "vite",
    "build": "vite build",
    "start": "deno serve -A _fresh/server.js",
    "update": "deno run -A -r jsr:@fresh/update ."
  },
  "lint": { "rules": { "tags": ["fresh", "recommended"] } },
  "exclude": ["**/_fresh/*"],
  "imports": {
    "@/": "./",
    "fresh": "jsr:@fresh/core@^2.3.3",
    "preact": "npm:preact@^10.29.1",
    "@preact/signals": "npm:@preact/signals@^2.9.0",
    "@fresh/plugin-vite": "jsr:@fresh/plugin-vite@^1.1.2",
    "vite": "npm:vite@^7.1.3",
    "@types/babel__core": "npm:@types/babel__core@^7.20.5"
  },
  "compilerOptions": {
    "lib": ["dom", "dom.asynciterable", "dom.iterable", "deno.ns"],
    "jsx": "precompile",
    "jsxImportSource": "preact",
    "jsxPrecompileSkipElements": ["a","img","source","body","html","head","title","meta","script","link","style","base","noscript","template"],
    "types": ["vite/client"]
  }
}
```
With `--tailwind` init adds `"tailwindcss": "npm:tailwindcss@^4.1.10"`, `"@tailwindcss/vite": "npm:@tailwindcss/vite@^4.1.12"` and `vite.config.ts` gets `tailwindcss()`; `.vscode/settings.json` adds `"files.associations": {"*.css": "tailwindcss"}` and extensions add `bradlc.vscode-tailwindcss`.

`main.ts` (verbatim):
```ts
import { App, staticFiles } from "fresh";
import { define, type State } from "./utils.ts";

export const app = new App<State>();
app.use(staticFiles());
// Pass a shared value from a middleware
app.use(async (ctx) => { ctx.state.shared = "hello"; return await ctx.next(); });
// this is the same as the /api/:name route defined via a file. feel free to delete this!
app.get("/api2/:name", (ctx) => { const name = ctx.params.name; return new Response(`Hello, ${name.charAt(0).toUpperCase() + name.slice(1)}!`); });
const exampleLoggerMiddleware = define.middleware((ctx) => { console.log(`${ctx.req.method} ${ctx.req.url}`); return ctx.next(); });
app.use(exampleLoggerMiddleware);
// Include file-system based routes here
app.fsRoutes();
```
Note: `main.ts` **exports** `app` and does **not** call `app.listen()` — the Vite plugin generates `_fresh/server.js` and `deno serve` runs it (docs: calling `.listen()` alongside `deno task dev`/`start` causes `AddrInUse`; https://usefresh.dev/docs/concepts/app).

`utils.ts`:
```ts
import { createDefine } from "fresh";
export interface State { shared: string; }
export const define = createDefine<State>();
```
`vite.config.ts`:
```ts
import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
export default defineConfig({ plugins: [fresh()] });
```
`client.ts`:
```ts
// Import CSS files here for hot module reloading to work.
import "./assets/styles.css";
```
`routes/_app.tsx`:
```tsx
import { define } from "../utils.ts";
export default define.page(function App({ Component }) {
  return (<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>demo2</title></head><body><Component /></body></html>);
});
```
`routes/index.tsx` (note it uses `<Head>` from `fresh/runtime` and the island):
```tsx
import { useSignal } from "@preact/signals";
import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import Counter from "../islands/Counter.tsx";
export default define.page(function Home(ctx) {
  const count = useSignal(3);
  console.log("Shared value " + ctx.state.shared);
  return (<div class="..."><Head><title>Fresh counter</title></Head> ... <Counter count={count} /></div>);
});
```
`routes/api/[name].tsx`:
```tsx
import { define } from "../../utils.ts";
export const handler = define.handlers({
  GET(ctx) { const name = ctx.params.name; return new Response(`Hello, ${name.charAt(0).toUpperCase() + name.slice(1)}!`); },
});
```
`islands/Counter.tsx`:
```tsx
import type { Signal } from "@preact/signals";
import { Button } from "../components/Button.tsx";
interface CounterProps { count: Signal<number>; }
export default function Counter(props: CounterProps) {
  return (<div class="flex gap-8 py-6"><Button id="decrement" onClick={() => props.count.value -= 1}>-1</Button><p class="text-3xl tabular-nums">{props.count}</p><Button id="increment" onClick={() => props.count.value += 1}>+1</Button></div>);
}
```
`components/Button.tsx` is a plain Preact component (`ComponentChildren`, spreads props onto `<button>`). `.gitignore` ignores `.env*`, `_fresh/`, `node_modules/`, `vendor/`. `.vscode/settings.json`: `"deno.enable": true, "deno.lint": true, "editor.defaultFormatter": "denoland.vscode-deno"` (+ per-language). Dockerfile: `RUN deno cache _fresh/server.js` / `CMD ["serve", "-A", "_fresh/server.js"]`.

Build output (2.x/Vite): `_fresh/server.js` (server entry), `_fresh/server/`, `_fresh/client/` (from `@fresh/plugin-vite` `mod.ts`: ssr outDir `_fresh/server`, client outDir `_fresh/client`). Sources: https://raw.githubusercontent.com/denoland/fresh/main/packages/plugin-vite/src/mod.ts, https://usefresh.dev/docs/advanced/vite.

`@fresh/core` package exports (https://jsr.io/@fresh/core/2.3.3 `deno.json`): `"."→src/mod.ts`, `"./runtime"→src/runtime/shared.ts`, `"./runtime-client"`, `"./dev"→src/dev/mod.ts` (Builder), `"./compat"→src/compat.ts` (1.x-style aliases), `"./internal"`, `"./internal-dev"`. `@fresh/plugin-vite` exports `"."` and `"./client"`.

### 1.2 Fresh 1.7.3 — what its `init.ts` generates

(Source: https://raw.githubusercontent.com/denoland/fresh/1.7.3/init.ts, https://raw.githubusercontent.com/denoland/fresh/1.7.3/src/dev/imports.ts; verified by running it.) Flags: `--force --tailwind --twind --vscode --docker`.
```
.gitignore  .vscode/{settings,extensions}.json  README.md  components/Button.tsx  deno.json
dev.ts  fresh.config.ts  fresh.gen.ts  islands/Counter.tsx  main.ts
routes/_404.tsx  routes/_app.tsx  routes/api/joke.ts  routes/greet/[name].tsx  routes/index.tsx
static/favicon.ico  static/logo.svg  static/styles.css
(+ tailwind.config.ts / twind.config.ts / Dockerfile optionally)
```
`deno.json` (verbatim as generated; the `$fresh/` value is normally `https://deno.land/x/fresh@1.7.3/` — `freshImports()` derives it from `import.meta.url` of the init script, so in my run it pointed at raw.githubusercontent.com):
```json
{
  "lock": false,
  "tasks": {
    "check": "deno fmt --check && deno lint && deno check **/*.ts && deno check **/*.tsx",
    "cli": "echo \"import '\\$fresh/src/dev/cli.ts'\" | deno run --unstable -A -",
    "manifest": "deno task cli manifest $(pwd)",
    "start": "deno run -A --watch=static/,routes/ dev.ts",
    "build": "deno run -A dev.ts build",
    "preview": "deno run -A main.ts",
    "update": "deno run -A -r https://fresh.deno.dev/update ."
  },
  "lint": { "rules": { "tags": ["fresh", "recommended"] } },
  "exclude": ["**/_fresh/*"],
  "imports": {
    "$fresh/": "https://deno.land/x/fresh@1.7.3/",
    "preact": "https://esm.sh/preact@10.22.0",
    "preact/": "https://esm.sh/preact@10.22.0/",
    "@preact/signals": "https://esm.sh/*@preact/signals@1.2.2",
    "@preact/signals-core": "https://esm.sh/*@preact/signals-core@1.5.1",
    "$std/": "https://deno.land/std@0.216.0/"
  },
  "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "preact" }
}
```
(`--tailwind` adds `"tailwindcss": "npm:tailwindcss@3.4.1"`, `"tailwindcss/"`, `"tailwindcss/plugin"` and `"nodeModulesDir": true`.)

`main.ts`:
```ts
/// <reference no-default-lib="true" />
/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />
import "$std/dotenv/load.ts";
import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";
await start(manifest, config);
```
`dev.ts`:
```ts
#!/usr/bin/env -S deno run -A --watch=static/,routes/
import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";
import "$std/dotenv/load.ts";
await dev(import.meta.url, "./main.ts", config);
```
`fresh.config.ts`: `import { defineConfig } from "$fresh/server.ts"; export default defineConfig({});` (with `plugins: [tailwind()]` from `$fresh/plugins/tailwind.ts` when chosen).

`fresh.gen.ts` (generated by `src/dev/manifest.ts` `generate()`, verbatim from my run):
```ts
// DO NOT EDIT. This file is generated by Fresh.
// This file SHOULD be checked into source version control.
// This file is automatically updated during development when running `dev.ts`.

import * as $_404 from "./routes/_404.tsx";
import * as $_app from "./routes/_app.tsx";
import * as $api_joke from "./routes/api/joke.ts";
import * as $greet_name_ from "./routes/greet/[name].tsx";
import * as $index from "./routes/index.tsx";
import * as $Counter from "./islands/Counter.tsx";
import type { Manifest } from "$fresh/server.ts";

const manifest = {
  routes: {
    "./routes/_404.tsx": $_404,
    "./routes/_app.tsx": $_app,
    "./routes/api/joke.ts": $api_joke,
    "./routes/greet/[name].tsx": $greet_name_,
    "./routes/index.tsx": $index,
  },
  islands: { "./islands/Counter.tsx": $Counter },
  baseUrl: import.meta.url,
} satisfies Manifest;

export default manifest;
```
Identifier rule (`specifierToIdentifier`): strip `./routes/` or `./islands/` prefix and extension, `stringToIdentifier`, prefix `$`, dedupe with `_1`, `_2`. Type: `Manifest { routes: Record<string, RouteModule|MiddlewareModule>, islands: Record<string, IslandModule>, baseUrl: string }` (https://raw.githubusercontent.com/denoland/fresh/1.7.3/src/server/mod.ts). 1.x build output: `_fresh/snapshot.json` + `_fresh/static/` (docs/1.x/concepts/ahead-of-time-builds.md).

### 1.3 Fresh 2 in "builder" mode (`--builder`, alpha-era, still supported)
`dev.ts`:
```ts
#!/usr/bin/env -S deno run -A --watch=static/,routes/
import { Builder } from "fresh/dev";
const builder = new Builder();
if (Deno.args.includes("build")) { await builder.build(); } else { await builder.listen(() => import("./main.ts")); }
```
tasks: `dev: "deno run -A --watch=static/,routes/ dev.ts"`, `build: "deno run -A dev.ts build"`, `start: "deno serve -A _fresh/server.js"`; no `vite`/`@fresh/plugin-vite` imports; CSS in `static/styles.css` + `<link>` in `_app.tsx`. `Builder` options: `target, root, outDir("_fresh"), staticDir (string|string[]), islandDir("islands"), routeDir("routes"), serverEntry("main.ts"), ignore (RegExp[], default [TEST_FILE_PATTERN]), sourceMap`; `builder.registerIsland(spec)`. (https://raw.githubusercontent.com/denoland/fresh/main/packages/fresh/src/dev/builder.ts, https://usefresh.dev/docs/advanced/builder)

### 1.4 Detection heuristics (2.x vs 1.x)

| Signal | Fresh 2.x | Fresh 1.x |
|---|---|---|
| `deno.json.imports` | `"fresh": "jsr:@fresh/core@^2..."` (the official updater's own check is `imports["fresh"]?.includes("@fresh/core")` — `@fresh/update` `detectFresh2()`), `@fresh/plugin-vite`, `vite`, `npm:preact`, `npm:@preact/signals`, optional `@/` alias | `"$fresh/": "https://deno.land/x/fresh@1.x.y/"`, `preact` via esm.sh, `@preact/signals-core`, `$std/` |
| tasks | `dev: vite`, `build: vite build`, `start: deno serve -A _fresh/server.js`, `update: deno run -A -r jsr:@fresh/update .` (builder mode: `dev.ts`) | `start: deno run -A --watch=static/,routes/ dev.ts`, `build: deno run -A dev.ts build`, `preview: deno run -A main.ts`, `cli`/`manifest` tasks, `update: https://fresh.deno.dev/update` |
| compilerOptions | `jsx: "precompile"`, `jsxPrecompileSkipElements`, `types: ["vite/client"]`, `lib` incl `deno.ns` | `jsx: "react-jsx"` |
| `nodeModulesDir` | `"manual"` | `true` only with tailwind |
| Files | `main.ts` (`export const app = new App`, `fsRoutes()`), `vite.config.ts`, `client.ts`, `utils.ts` (`createDefine`), `assets/` | `fresh.gen.ts`, `fresh.config.ts`, `dev.ts` (`$fresh/dev.ts`), `main.ts` (`start(manifest, config)`) |
| Imports in code | `from "fresh"`, `"fresh/runtime"`, `"fresh/dev"`, `"fresh/compat"` | `"$fresh/server.ts"`, `"$fresh/runtime.ts"`, `"$fresh/dev.ts"`, `"$fresh/plugins/*.ts"` |
| Handler export | `handlers` (preferred) or `handler`; single `(ctx)` arg | `handler` only (`handlers` throws at startup); `(req, ctx)` |
| Error pages | `_error.tsx` (also `_404.tsx`, `_500.tsx` still recognised) | `_404.tsx`, `_500.tsx` only |
| Build dir | `_fresh/server.js`, `_fresh/client/`, `_fresh/server/` | `_fresh/snapshot.json`, `_fresh/static/` |
| lint | `tags: ["fresh","recommended"]` in both | same |

Both versions: `routes/`, `islands/`, `components/`, `static/`, `.vscode/settings.json` with `deno.enable`.

---

## 2. Routing — Fresh 2.x

### 2.1 File-system crawl rules (`packages/fresh/src/dev/fs_crawl.ts`, used by both the Vite plugin (`crawlFsItem` from `fresh/internal-dev`) and the Builder)
- `walkDir(fs, dir, cb, ignore)` uses `@std/fs` `walk` with `includeDirs:false, includeFiles:true, exts: ["tsx","jsx","ts","js"], skip: ignore` — recursive; **only those four extensions**. Default `ignore = [TEST_FILE_PATTERN]` = `/[._]test\.(?:[tj]sx?|[mc][tj]s)$/` (constants.ts).
- `GROUP_REG = /[/\\\\]\((_[^/\\\\]+)\)[/\\\\]/` — any directory segment `(_xxx)` is **excluded from routes**; if it is exactly `(_islands)` the file is registered as an island. `(_components)` is just an ignored folder (docs: "Fresh does not treat these files specially").
- `id` = path relative to `routes/` minus extension, with leading `/`. Classification by suffix: `/_middleware` → Middleware (pattern = `pathToPattern(dir, {keepGroups:true})`), `/_layout` → Layout, `/_app` → App, `/_404` → NotFound, `/_error` or `/_500` → Error, else Route.
- Route: `pattern = pathToPattern(id.slice(1), {keepGroups:true})` (+ trailing `/` if the file is `index`), `routePattern = pathToPattern(id.slice(1))` (groups stripped). Then: `const code = await fs.readTextFile(entry.path); lazy = !code.includes("routeOverride");` — i.e. **a plain substring check on file text decides eager vs lazy loading**, and `overrideConfig = { methods: "ALL" }` (with a `// TODO: We could do an AST parse here to detect the kind of handler`). Files are sorted with `sortRoutePaths` (`_app` first; `_middleware`(score 6) > `_layout`/other `_`(5) > `_error`(4) > `index`(3) > literal(2) > `[param]`(1) > `[...rest]`(0); a `(group)` segment sorts after literal but before `[`).
- Observation: for `_500` the code computes the pattern with `id.slice(1, -"/_error".length)` (7 chars vs 5), so a nested `routes/x/_500.tsx` gets a truncated pattern — looks like a bug; root `_500.tsx` still yields `/`. **UNVERIFIED at runtime.**

### 2.2 `pathToPattern` (`packages/fresh/src/router.ts`, same algorithm in 1.x `src/server/fs_extract.ts`)
- trailing `index` segment dropped (`index` alone → `/`); `[...rest]` → `/:rest*`; `(group)` segments dropped unless `keepGroups`; `][` adjacent params throw `SyntaxError`; `[[opt]]` must be a full segment → `{/:opt}?`; mixed literals allowed (`[id]-asdf`, `[id]@[bar]`, `asdf[bar]`); if the route starts with an optional segment and has no non-optional segment → `/{:name}?`; empty → `/`.
- Table (docs/latest/concepts/file-routing.md): `index.ts`→`/`, `about.ts`→`/about`, `blog/index.ts`→`/blog`, `blog/[slug].ts`→`/blog/:slug`, `blog/[slug]/comments.ts`→`/blog/:slug/comments`, `old/[...path].ts`→`/old/:path*`, `docs/[[version]]/index.ts`→`/docs{/:version}?`, `[[name]].ts`→`/{:name}?`. Patterns are `URLPattern` syntax; static routes win over dynamic, dynamic in registration order (docs/latest/concepts/routing.md).
- `export const config: RouteConfig = { routeOverride: "/x/:module@:version/:path*" }` replaces the file-derived pattern.

### 2.3 Route module exports (`packages/fresh/src/fs_routes.ts`)
```ts
export interface FreshFsMod<State> {
  config?: RouteConfig;
  handler?: RouteHandler<unknown, State> | HandlerFn<unknown, State>[];
  handlers?: RouteHandler<unknown, State>;
  default?: AnyComponent<PageProps<unknown, State>> | AsyncAnyComponent<PageProps<unknown, State>>;
  css?: string[];
}
```
- `isFreshFile`: valid if `typeof mod.default === "function"` (or an array for middleware), or `config` object, or `handlers`/`handler` object|function. Otherwise: `Could not find relevant exports in: <file>` ("Route files must export a default component, a "handler" or "handlers" export, or a "config" export").
- `const handlers = mod.handlers ?? mod.handler ?? null;` (**`handlers` wins**), and `if (typeof handlers === "function" && handlers.length > 1) throw "Handlers must only have one argument..."` → a 1.x-style `(req, ctx)` function is a startup error.
- Middleware files: `handlers ?? mod.default`; an object-by-method middleware is rejected ("Middleware does not support object handlers with GET, POST..."); single fn or array accepted.
- Layout: needs `default`; a handler export triggers a warning. Error (`_error`/`_500`) & NotFound (`_404`): `component`, `config`, `css`, `handler`. App (`_app`): `default` only.
- `export const css = ["./assets/dashboard.css"]` loads extra CSS for a route (docs file-routing).
- `normalizeRoute` sets `config.routeOverride ??= routePattern`.

Types (`types.ts`):
```ts
export interface RouteConfig { routeOverride?: string; csp?: boolean; skipInheritedLayouts?: boolean; skipAppWrapper?: boolean; methods?: "ALL" | Method[]; }
export interface LayoutConfig { skipInheritedLayouts?: boolean; skipAppWrapper?: boolean; }
export interface Route<State> { component?: RouteComponent<State>; config?: RouteConfig; handler?: RouteHandler<unknown, State>; css?: string[]; }
export type Lazy<T> = () => Promise<T>; export type MaybeLazy<T> = T | Lazy<T>;
```
`handlers.ts`: `RouteHandler<Data,State> = HandlerFn | HandlerByMethod`; `HandlerFn = (ctx: Context<State>) => Response | PageResponse<Data> | Promise<...>`; `HandlerByMethod = { [M in Method]?: HandlerFn }`; `Method = "HEAD"|"GET"|"POST"|"PATCH"|"PUT"|"DELETE"|"OPTIONS"` (router.ts); `page(data, {headers, status})` returns `PageResponse<T> {data, headers?, status?}`; missing method → 405; `HEAD` falls back to `GET`. A handler may also return `{ data, headers, status }` directly.

### 2.4 `createDefine` (`define.ts`) — all four are identity functions
```ts
export interface Define<State> {
  handlers<Data, Handlers extends RouteHandler<Data, State> = RouteHandler<Data, State>>(handlers: Handlers): typeof handlers;
  page<Handler extends RouteHandler<any, State> = never, Data = ...>(render: AnyComponent<PageProps<Data, State>>): typeof render;
  middleware<M extends Middleware<State> | Middleware<State>[]>(middleware: M): typeof middleware;
  layout(render: AnyComponent<PageProps<unknown, State>>): typeof render;
}
export function createDefine<State>(): Define<State> { return { handlers(h){return h}, page(r){return r}, layout(r){return r}, middleware(m){return m} }; }
```
Usage pattern: `export const handler = define.handlers({...}); export default define.page<typeof handler>(({ data }) => ...)`. (The docs page https://usefresh.dev/docs/advanced/define mentions `define.handler()` — that is a doc typo; the API is `define.handlers`.)

### 2.5 `Context` (`context.ts`, identical members in 2.3.3)
`readonly config: ResolvedFreshConfig; readonly url: URL; req: Request; readonly route: string | null; readonly params: Record<string,string>; readonly state: State; data: unknown; error: unknown | null; readonly info: Deno.ServeHandlerInfo; readonly isPartial: boolean; next: () => Promise<Response>; Component: FunctionComponent;` methods: `redirect(pathOrUrl, status = 302)` (collapses `//` to prevent open redirects; preserves `fresh-partial` param), `render(vnode: VNode | null, init?: ResponseInit, config?: LayoutConfig)` (composes layouts + app wrapper; adds `<!DOCTYPE html>`, fallback `<html><head><body>`), `text()`, `html()`, `json()` (= `Response.json`), `stream(iterable, init?)`, `upgrade(options?)` → `{socket, response}` (bare) / `upgrade(handlers, options?)` → `Response` (managed; `WebSocketHandlers {open, message, close, error}`, `WebSocketUpgradeOptions {idleTimeout (default 120), protocol}`; throws `HttpError(400, "Expected a WebSocket upgrade request")`). `FreshContext` is a deprecated alias of `Context`. `PageProps<Data,State> = Pick<Context, "config"|"url"|"req"|"params"|"info"|"state"|"isPartial"|"Component"|"error"|"route"> & { data: Data }` (render.ts). Async page components may return `Response` or JSX.

### 2.6 `App` (`app.ts`; `FreshConfig` in `config.ts`)
`new App<State>(config?: { basePath?: string; mode?: "development"|"production"; trustProxy?: boolean })` — resolved config also has `root`. Methods (all return `this`): `use(...mw)` / `use(path, ...mw)`; `get/post/patch/put/delete/head/all(path, ...middlewares)` (**no `.options()` method exists in source on `main` or 2.3.3, although https://usefresh.dev/docs/concepts/routing lists it**); `route(path, route | lazy, config?)`; `fsRoutes(pattern = "*")` ("Insert file routes collected in Builder at this point"; can mount at a sub-path; nested fsRoutes not supported); `layout(path, component, config?)`; `appWrapper(component)`; `notFound(routeOrMiddleware)` (root only, not nestable); `onError(path, routeOrMiddleware)` (nestable per path); `ws(path, handlers, options?)` (registers a GET route that upgrades); `mountApp(path, app)`; `handler()` → `(req, info?) => Promise<Response>`; `listen(options?: ListenOptions)` (`Partial<Deno.ServeTcpOptions & Deno.TlsCertifiedKeyPem> & { remoteAddress?: string }`). Middlewares/handlers may be lazy: `app.use("/x", async () => (await import("./mw.ts")).default)`. Registration order matters (top-to-bottom).

### 2.7 2.3-era additions — all confirmed present in the published `@fresh/core@2.3.3` / `@fresh/plugin-vite@1.1.2` sources on jsr.io
- `ctx.upgrade()` and `app.ws()` (see 2.5/2.6; docs https://usefresh.dev/docs/advanced/websockets — the docs on `main` add a note that WS under the *Vite dev server* needs "Fresh 2.4+ and Deno 2.8+", i.e. the `main` docs are slightly ahead of 2.3.3).
- View transitions: `f-view-transition` attribute next to `f-client-nav` (`VIEW_TRANSITION_ATTR = "f-view-transition"` in `runtime/shared_internal.ts`; docs https://usefresh.dev/docs/advanced/view-transitions).
- `staticDir: string | string[]` in both `fresh({ staticDir: ["static", "generated"] })` (plugin-vite `utils.ts`) and `new Builder({ staticDir })`; first match wins (docs static-files).
- CSP: `csp({ reportOnly?, reportTo?, csp?: string[], useNonce? })`; with `useNonce` Fresh injects `nonce` on inline `<script>/<style>` and passes the nonce to the middleware via `NONCE_SYMBOL` on the Response (`middlewares/csp.ts`; docs https://usefresh.dev/docs/plugins/csp). Per-route `RouteConfig.csp` also exists.
- `trustProxy` (`config.ts`; respects `X-Forwarded-Proto`/`X-Forwarded-Host`).
- `ipFilter({ denyList, allowList }, { onBlocked })` exported from `fresh` (`middlewares/ip_filter.ts`; docs https://usefresh.dev/docs/plugins/ip-filter).
- `deno create @fresh/init` (JSR page; `@fresh/init` exports `./create`).
- `ctx.text/html/json/stream` helpers (context.ts, present in 2.3.3).

---

## 3. Routing — Fresh 1.x (1.7.3)

Sources: https://raw.githubusercontent.com/denoland/fresh/1.7.3/src/server/types.ts, `.../src/server/fs_extract.ts`, `.../src/dev/mod.ts`, `.../src/dev/manifest.ts`, `.../src/dev/dev_command.ts`, `.../server.ts`, `.../runtime.ts`, `.../dev.ts`; docs https://usefresh.dev/docs/1.x/concepts/{routing,routes,middleware,layouts,app-wrapper,error-pages,plugins,server-configuration}.

- Entry modules: `$fresh/server.ts` re-exports `src/server/mod.ts`: `start(manifest, config?)`, `createHandler(manifest, config?)`, `defineApp`, `defineLayout`, `defineRoute`, `defineConfig`, `ServerContext`, `STATUS_CODE`, `RenderContext`, and types `Handler, Handlers, HandlerContext, FreshContext, PageProps, RouteConfig, LayoutConfig, MiddlewareHandler, MiddlewareHandlerContext, MiddlewareModule?`(via types), `Plugin, PluginRoute, PluginMiddleware, PluginIslands, FreshConfig/FreshOptions/StartOptions, RouteContext, RouterOptions, Manifest, ...`. `$fresh/runtime.ts` re-exports `src/runtime/utils.ts` (`IS_BROWSER`, `asset`, `assetSrcSet`, `INTERNAL_PREFIX = "/_frsh"`, `ASSET_CACHE_BUST_KEY = "__frsh_c"`, `assetHashingHook`), `head.ts` (`Head`), `csp.ts` (`useCSP`), `Partial.tsx` (`Partial`). `$fresh/dev.ts` default-exports `dev(base, entrypoint, config?)`.
- Types (verbatim essentials):
```ts
export type Handler<T = any, State = Record<string, unknown>> = (req: Request, ctx: FreshContext<State, T>) => Response | Promise<Response>;
export type Handlers<T = any, State = Record<string, unknown>> = { [K in router.KnownMethod]?: Handler<T, State> };
export interface FreshContext<State = Record<string, unknown>, Data = any, NotFoundData = Data> {
  localAddr?: Deno.NetAddr; remoteAddr: Deno.NetAddr; url: URL; basePath: string; route: string; pattern: string /*deprecated*/;
  destination: "internal" | "static" | "route" | "notFound"; params: Record<string,string>; isPartial: boolean; state: State;
  config: ResolvedFreshConfig; data: Data; error?: unknown; codeFrame?: unknown;
  renderNotFound: (data?: NotFoundData) => Response | Promise<Response>;
  render: (data?: Data, options?: RenderOptions) => Response | Promise<Response>;
  Component: ComponentType<unknown>; next: () => Promise<Response>;
}
export type PageProps<T = any, S = Record<string, unknown>> = Omit<FreshContext<S, T>, "render" | "next" | "renderNotFound">;
export type RouteContext<T = any, S = ...> = Omit<FreshContext<S, T>, "next" | "render">;
export interface RouteConfig { routeOverride?: string; csp?: boolean; skipInheritedLayouts?: boolean; skipAppWrapper?: boolean; }
export interface LayoutConfig { skipAppWrapper?: boolean; skipInheritedLayouts?: boolean; }
export interface RouteModule { default?: PageComponent<PageProps>; handler?: Handler | Handlers; config?: RouteConfig; }
export type MiddlewareHandler<State = ...> = (req: Request, ctx: FreshContext<State>) => Response | Promise<Response>;
export interface MiddlewareModule<State = any> { handler: MiddlewareHandler<State> | MiddlewareHandler<State>[]; }
export interface LayoutModule { handler?: Handler | Handlers; default: ComponentType<PageProps> | AsyncLayout; config?: LayoutConfig; }
export interface IslandModule { [key: string]: ComponentType<any> | unknown; }
export interface FreshConfig { build?: { outDir?: string; target?: string | string[] }; render?: RenderFunction; plugins?: Plugin[]; staticDir?: string; router?: { trailingSlash?: boolean; ignoreFilePattern?: RegExp; basePath?: string }; server?: Partial<Deno.ServeTlsOptions>; /* + deprecated port/hostname/cert/key/... */ }
export interface Plugin<State = ...> { name: string; entrypoints?: Record<string,string>; render?(ctx): PluginRenderResult; renderAsync?(ctx): Promise<PluginRenderResult>; buildStart?(config): ...; buildEnd?(): ...; configResolved?(config): ...; routes?: PluginRoute[]; middlewares?: PluginMiddleware<State>[]; islands?: PluginIslands /* { baseLocation: string; paths: string[] } */; }
```
Deprecated aliases still exported: `HandlerContext`, `MiddlewareHandlerContext`, `AppContext`, `LayoutContext`, `UnknownHandlerContext`, `ErrorHandlerContext`, `LayoutProps`, `AppProps`, `UnknownPageProps`, `ErrorPageProps`, `MultiHandler`, `StartOptions`, `FreshOptions`.
- `defineRoute/defineLayout/defineApp(fn: (req, ctx: RouteContext) => ComponentChildren | Response | Promise<...>)` wrap sync fns as async (`src/server/defines.ts`).
- `collect(directory, ignoreFilePattern?)` (`src/dev/mod.ts`): walks `routes/` and `islands/` (recursive, `exts: ["tsx","jsx","ts","js"]`, skip `TEST_FILE_PATTERN = /[._]test\.(?:[tj]sx?|[mc][tj]s)$/`), same `GROUP_REG` — `(_xxx)` dirs ignored, `(_islands)` → islands; throws `Route conflict detected. Multiple files have the same name` when two route files differ only by extension; sorts both lists. `dev()` re-runs `collect()` on every start, regenerates `fresh.gen.ts` if changed (`FRSH_DEV_PREVIOUS_MANIFEST` env), then `import(fresh.gen.ts)`; `dev.ts build` → `build(state)`.
- `extractRoutes` (`fs_extract.ts`): iterates `manifest.routes` (+ plugin routes/middlewares), sorts with `sortRoutePaths` (`_app` first, `_middleware`(4) > `_`(3) > literal(2) > `[`(1) > `[...`(0)). Special: `/_app.(tsx|ts|jsx|js)`, `*/_layout.*`, `*/_middleware.*`, `/_404.*`, `/_500.*` (**no `_error.tsx` in 1.x**; any other `/_`-prefixed root file is ignored). Regular routes: `handler` object|function; `if (!handler && "handlers" in module) throw 'Found named export "handlers" in ... instead of "handler". Did you mean "handler"?'`; auto `GET = (_req, {render}) => render()` when a component exists; auto `HEAD` from `GET`; `config.routeOverride/csp/skipAppWrapper/skipInheritedLayouts`. Middlewares: `module.handler` fn or array (plugins' middlewares are merged into synthetic `./routes/<path>/_middleware.ts` entries).
- Islands (1.x): for each `manifest.islands` entry (and plugin `islands.paths`), `name = sanitizeIslandName(path relative to islands/ without ext)` (PascalCase; subdirectories become part of the name), then **every exported function becomes an island**: `id = \`${name.toLowerCase()}_${exportName.toLowerCase()}\``, with `exportName` recorded. HTML markers look like `<!--frsh-myisland_default:default:0-->`.
- `start(manifest, config)` → `ServerContext.fromManifest` + `Deno.serve`; `createHandler(manifest, config)` for tests. Plugins are passed via `fresh.config.ts` `defineConfig({ plugins: [tailwind()] })` (`$fresh/plugins/tailwind.ts`, `$fresh/plugins/twind.ts`, `$fresh/plugins/twindv1.ts`).
- 1.x route docs examples (docs/1.x/concepts/routes.md): `export const handler: Handlers = { GET(_req, ctx) { return new Response("Hello World"); } }`; `export default function Page(props: PageProps)`; async route `export default async function MyPage(req: Request, ctx: RouteContext)`; `ctx.render(data)`, `ctx.renderNotFound()`.

---

## 4. Islands

### 4.1 Discovery — 2.x (Vite plugin and Builder both call `crawlFsItem`)
- Sources: `islands/` (or `islandsDir`/`islandDir`) walked **recursively** (any depth) with extensions `tsx, jsx, ts, js`, minus `ignore` (default test-file pattern); every `(_islands)` directory anywhere under `routes/`; plus explicit `islandSpecifiers: string[]` in `fresh({...})` (vite) / `builder.registerIsland("jsr:@scope/pkg/Island.tsx")` (Builder) — local paths, `file://`, `jsr:`, `npm:`, `https:` all accepted (`specToName` handles each). Vite dev server also watches for added/removed island files (`client_snapshot.ts` `isIslandPath`).
- Registration (`packages/fresh/src/build_cache.ts` `IslandPreparer.prepare`): **every exported function in an island module is an island**; `export default` is named after the file (`pathToExportName(basename)`: non-identifier chars → `_`), named exports keep their export name; names deduped by `UniqueNamer`. So multiple islands per file and named-export islands are supported (docs only show default exports; the docs' own "Countdown" example uses `export function Countdown()` and imports it as a named export).
- Naming guidance (docs/latest/concepts/islands.md): "The name of this file must be a PascalCase or kebab-case name of the island" — a convention, not enforced by the crawler.
- There is **no glob-style `islands` config**; config is `islandsDir` (string), `routeDir`, `ignore: RegExp[]`, `islandSpecifiers: string[]` (`FreshViteConfig` in plugin-vite `src/utils.ts`; docs https://usefresh.dev/docs/advanced/vite). There is no `island-*` file-prefix marker; location decides.
- `staticFiles()` middleware is required or island JS is not served (docs file-routing).

### 4.2 Discovery — 1.x
`islands/` walked recursively + `(_islands)` folders (see §3); all function exports become islands (`fs_extract.ts`); plugins can add islands via `Plugin.islands = { baseLocation, paths }`.

### 4.3 Serializable props
- 2.x (`packages/fresh/src/jsonify/stringify.ts` + docs/latest/advanced/serialization.md): `null, undefined, boolean, number (incl. NaN, ±Infinity, -0), bigint, string, array (sparse ok), plain object (string keys), Uint8Array, URL, Date, RegExp, Set, Map, Temporal.{Instant, ZonedDateTime, PlainDate, PlainTime, PlainDateTime, PlainYearMonth, PlainMonthDay, Duration}`, Preact `Signal` (serialized via `.peek()`, revived as a new `signal()`; shared signal instances preserved), computed signals (static value), and JSX elements (server-rendered, incl. `children: ComponentChildren`). Circular refs supported. **Not**: functions/closures (`throw new Error("Serializing functions is not supported.")`), class instances (prototype lost), Symbols, WeakMap/WeakSet, Streams/Promises.
- 1.x (`src/server/serializer.ts` + docs/1.x/concepts/islands.md): `null, boolean, number (Infinity/-Infinity/NaN → null), bigint, string, array, plain object, Uint8Array, Signal`; JSX only as `props.children` (VNode → `null` placeholder, restored from rendered HTML); circular refs ok; **`Date`, custom classes, functions, Map/Set not supported** (docs suggest passing dates as ISO strings).

### 4.4 Runtime imports inside islands
- 2.x: `import { IS_BROWSER, asset, assetSrcSet, Head, Partial, HttpError } from "fresh/runtime";` — `IS_BROWSER = typeof document !== "undefined"` (`runtime/shared.ts`). `fresh/runtime` is documented as "Safe to import in islands" (https://usefresh.dev/docs/advanced/api-reference). Hooks/signals: `import { useSignal, signal, computed } from "@preact/signals"`, `import { useEffect, useState } from "preact/hooks"`.
- 1.x: `import { IS_BROWSER, asset, Head, Partial, useCSP } from "$fresh/runtime.ts";`.
- Nested islands work in both (props still serialized). `FRESH_PUBLIC_*` env vars are inlined into island bundles at build time only when written literally as `Deno.env.get("FRESH_PUBLIC_X")` / `process.env.FRESH_PUBLIC_X` (docs/latest/advanced/environment-variables.md).

---

## 5. Server/client boundary rules

- Only islands (and what they import, plus `client.ts`) are bundled for the browser; `routes/`, `_app`, `_layout`, `_middleware`, `main.ts` run server-only. Event handlers in route components never fire → lint rule `fresh-server-event-handlers` ("Components inside the `routes/` folder in a fresh app are exclusively rendered on the server", https://docs.deno.com/lint/rules/fresh-server-event-handlers).
- What breaks when an island (transitively) imports server-only code: the Vite plugin builds two environments via `@deno/loader` `Workspace` — `platform: "node"` for SSR and `platform: "browser"` for the client (plugin-vite `src/plugins/deno.ts`), and runs `checkImports` with a built-in rule: for the client env, `if (isBuiltin(id)) → { type: "error", message: "Node built-in modules cannot be imported in the browser." }` (plugin-vite `src/mod.ts`, `src/plugins/verify_imports.ts`; it prints the importer chain). `Deno.*` globals, `jsr:@std/fs`, DB clients, `Deno.env` etc. are not caught by a rule but fail at bundle/run time in the browser (`Deno is not defined`) — a static analyzer should flag: `node:*` imports, `Deno.` member access, `@std/fs`, `@std/io`, DB/driver packages, `Deno.env`, `Deno.readTextFile` in any module reachable from an island or `client.ts`. Users can add their own `checkImports: ImportCheck[]` (`(id, env: "server"|"client") => { type: "warn"|"error", message, description?, hint? } | void`).
- Browser-only APIs (`window`, `document`, `EventSource`, `navigator`, `customElements`) must be guarded with `IS_BROWSER` (or `useEffect`) because islands are also rendered on the server (docs islands.md both versions).
- `static/`: served at the web root by `staticFiles()` (2.x) / automatically (1.x, higher priority than routes); `ETag`, immutable caching when `?__frsh_c=<BUILD_ID>` matches. 2.x rule: files **imported in code** (CSS etc.) go outside `static/` (e.g. `assets/`) and are imported from `client.ts`; URL-referenced files stay in `static/` (docs/latest/concepts/static-files.md). `asset("/x.pdf")` appends `__frsh_c=BUILD_ID`; `<img>/<source>` `src`/`srcset` are auto-locked unless `data-fresh-disable-lock`.
- Partials: `<Partial name="..." mode="replace|prepend|append">` from `fresh/runtime` (1.x: `$fresh/runtime.ts`); enable with `f-client-nav` on an ancestor (`f-client-nav={false}` opts out); `f-partial="/partials/..."` on `<a>`, `<button>`, `<form>`; partial requests carry `?fresh-partial=true` (`PARTIAL_SEARCH_PARAM`) and `ctx.isPartial`; 2.x adds `f-view-transition` and `_freshIndicator`. Partial routes usually set `config = { skipAppWrapper: true, skipInheritedLayouts: true }`.
- `<head>`: 2.x — the shell is written in `routes/_app.tsx`; `<Head>` from `fresh/runtime` still exists (works in routes *and* islands, dedupes `<title>`, `key`, `id`, `meta[name]`, `link[rel]`; https://usefresh.dev/docs/advanced/head). 1.x — `Head` from `$fresh/runtime.ts`.

---

## 6. Middleware & layouts

### 6.1 Fresh 2.x
- `Middleware<State> = (ctx: Context<State>) => Response | Promise<Response>`; `MiddlewareFn` deprecated alias; lazy `MaybeLazyMiddleware` may return a middleware. `_middleware.ts` shapes accepted: `export default define.middleware(fn)`, `export default [mw1, mw2]`, or `export const handler`/`handlers` = fn | fn[] (from `fs_routes.ts`: `handlers ?? mod.default`); by-method objects rejected.
- Execution order (`segments.ts` `segmentToMiddlewares`): the segment tree is walked **root → nested**; for each segment a synthetic middleware first installs that segment's app wrapper/layout/error route, then the segment's own middlewares run; `app.use()` globals run in registration order before later routes; `ctx.next()` continues the onion. Layouts accumulate outer→inner; `LayoutConfig.skipInheritedLayouts` resets the accumulated list to just that layout; `skipAppWrapper` drops the app wrapper; a route's `RouteConfig` does the same at render time (`renderRoute`). Error routes (`_error`/`onError(path)`) are per segment; 404 (`_404`/`notFound`) is root-only and only used when the thrown `HttpError.status === 404`.
- `_layout.tsx`: `export default define.layout(({ Component, state, url }) => ...)` (async allowed, may return a `Response`); one per directory; nest by directory; route groups `(name)/_layout.tsx` scope a layout without affecting the URL. `_app.tsx` app wrapper: `define.page(({ Component }) => <html>...)`; only one per App.
- Programmatic: `app.layout("/admin/*", AdminLayout, { skipInheritedLayouts?, skipAppWrapper? })`, `app.appWrapper(C)`, `app.onError("*", mwOrRoute)`, `app.notFound(mw)`.
- `ctx.state` typing: `new App<State>()` and `createDefine<State>()` (utils.ts pattern).
- Built-ins exported from `"fresh"` (`mod.ts`): `staticFiles()`, `trailingSlashes("always"|"never")`, `cors(CORSOptions)`, `csrf(CsrfOptions)`, `csp(CSPOptions)`, `ipFilter(rules, options)`, plus `HttpError`, `page`, `createDefine`, `App`.
- Error pages: `_error.tsx` (unified; check `ctx.error instanceof HttpError` for status), `_404.tsx` and `_500.tsx` still recognised by the crawler; `throw new HttpError(404)` replaces `ctx.renderNotFound()`.

### 6.2 Fresh 1.x
- `routes/_middleware.ts` exports `handler: MiddlewareHandler | MiddlewareHandler[]` with `(req, ctx)` signature (`export async function handler(req, ctx) {...}` or `export const handler = [mw1, mw2]`). Order: least specific first (`routes/_middleware.ts` → `routes/admin/_middleware.ts` → handler); `ctx.destination` ("internal"|"static"|"route"|"notFound") lets middleware skip asset requests; `ctx.state` shared; params available.
- `_layout.tsx` default export `({ Component, state }: PageProps)` or async `(req, ctx: FreshContext)`/`defineLayout`; `_app.tsx` similar (`defineApp`); `RouteConfig`/`LayoutConfig` `skipInheritedLayouts`/`skipAppWrapper` (docs/1.x/concepts/layouts.md, app-wrapper.md). Error pages `_404.tsx`/`_500.tsx` (docs/1.x/concepts/error-pages.md). No built-in middleware collection; `router.trailingSlash` is a config option; plugins can inject middlewares/routes/islands.

---

## 7. Tooling

- **`deno lsp`** is the language server the Deno VS Code extension starts ("Controls if the Deno Language Server is enabled. When enabled, the extension will disable the built-in VS Code JavaScript and TypeScript language services"; it "auto-identif[ies] and appl[ies] a `deno.jsonc` or `deno.json`" and lets you "resolve modules as the Deno CLI does" — https://docs.deno.com/runtime/reference/vscode/; https://docs.deno.com/runtime/reference/lsp_integration/). Because it embeds the CLI resolver, `deno.json` `imports` (`$fresh/`, `@/`), `jsr:`, `npm:`, `https:` and `jsxImportSource` are handled the same way `deno check` handles them (verified indirectly: `deno check` passes on both scaffolds with Deno 2.9.7; `deno lsp --help` confirms the subcommand). Fresh's troubleshooting page says missing-module errors in VS Code mean the Deno extension isn't enabled (https://usefresh.dev/docs/advanced/troubleshooting).
- **`deno check`**: `deno task check` = `deno fmt --check . && deno lint . && deno check` (2.x); 1.x: `deno fmt --check && deno lint && deno check **/*.ts && deno check **/*.tsx`. Verified: `deno check` → all 9 files OK on the 2.3.3 scaffold; `deno check main.ts` OK on 1.7.3.
- **`deno lint` `fresh` tag** — rules whose tags include `fresh` (verified with `deno lint --rules` on Deno 2.9.7, matches https://docs.deno.com/lint/rules/): `fresh-handler-export` (named export must be `handler`, not `handlers` — note this reflects 1.x; Fresh 2 accepts `handlers` and the init template uses `handler`), `fresh-server-event-handlers` (no `onClick`/`onclick`/function props in `routes/` components), `jsx-button-has-type`, `jsx-no-children-prop`, `jsx-no-comment-text-nodes`, `jsx-no-unescaped-entities`, `jsx-no-useless-fragment`, `jsx-void-dom-elements-no-children`, `react-no-danger`, `react-no-danger-with-children`, `react-rules-of-hooks`. Enable via `"lint": {"rules": {"tags": ["fresh"]}}` or `deno lint --rules-tags=fresh`. Deno lint plugins (`Deno.lint.runPlugin`) are only usable inside `deno test`/`deno bench` (https://docs.deno.com/runtime/reference/lint_plugins/) — not a general parsing API.
- **`typescript-language-server` / `tsc` cannot resolve a Fresh project**: verified — `tsc 5.9.3` with `moduleResolution: bundler`, `jsx: react-jsx`, `jsxImportSource: preact`, `allowImportingTsExtensions` on the 2.3.3 scaffold gives `TS2307: Cannot find module 'fresh'` and `'fresh/runtime'` (only `preact` resolved, because Deno had materialised `node_modules`). TypeScript has no import-map support (open issue https://github.com/microsoft/TypeScript/issues/43326 "Support import maps and bare import specifiers"), and `jsr:`/`npm:`/`https:` specifiers are unknown to tsserver; typescript-language-server is "a thin LSP interface on top of the tsserver API" (https://github.com/typescript-language-server/typescript-language-server), so it inherits this. A 1.x project is worse (`$fresh/` → https URL). Deno's own editor guidance is to use the Deno LSP instead.

---

## 8. Parsing options for a static analyzer

| Option | Parses TSX | Resolves `deno.json` imports (`$fresh/`, `@/`) | Resolves `jsr:` / `npm:` / `https:` | Dependency graph | Runtime | Notes |
|---|---|---|---|---|---|---|
| `deno info --json <entry>` | yes (any single `.ts/.tsx` file or `main.ts`) | yes (auto-discovers `deno.json`; `--config`, `--import-map`, `--no-config`) | yes: `jsr:` → `https://jsr.io/@scope/pkg/x.y.z/path.ts` (`packages` map gives version resolution), `npm:` → `node_modules/.deno/...` paths with `nodeModulesDir: manual` (else `npmPackages`), `https:` cached | full graph | needs `deno` binary + network/cache for remote deps (`--no-remote`, `--no-npm`, `--node-modules-dir`, `--lock`) | flag is documented "UNSTABLE"; verified on both scaffolds |
| `jsr:@deno/loader` (0.5.0) | n/a (loads+transpiles; `noTranspile`/`preserveJsx` options) | yes | yes | you walk it yourself (`resolve` per import) | **Deno and Node** (verified under Node 22 via `npx jsr add @deno/loader`) | This is what `@fresh/plugin-vite` uses |
| `jsr:@deno/graph` (0.111.0) | yes | via `resolve` callback (README example uses `import_map` module) | **UNVERIFIED** for `jsr:`/`npm:` in the JS API | full graph | JSR lists "Works with Deno" only | https://jsr.io/@deno/graph |
| `oxc-parser` (npm) | yes (`lang: 'tsx'`) | no | no | no (gives `module.staticImports/staticExports/dynamicImports`) | Node (napi) | fastest per-file syntax + export inventory |
| TypeScript compiler API / ts-morph | yes | no (only tsconfig `paths`) | no | only via your own resolver | Node | `@fresh/update` itself uses ts-morph for its codemods; fine for syntax, not resolution |
| `@swc/wasm`, community `deno_ast` wasm builds (`@denext/swc`, `@deco/deno-ast-wasm`, `@jsz/swc` on JSR) | yes | no | no | no | wasm | there is **no official `@deno/ast` on JSR** (404); `deno_ast` is a Rust crate only |

Details:
- `deno info --json` output shape (verified, `"version": 1`): `{ version, roots: [file://...], modules: [{ kind: "esm"|"asserted"|"external"|..., specifier, local, size, mediaType: "TypeScript"|"TSX"|"JavaScript"|"Json"|..., dependencies: [{ specifier: "<as written>", code?: { specifier: "<resolved>", resolutionMode: "import", span: {start:{line,character}, end:{...}} }, type?: {...} }], error? }], imports: [{ referrer: "<deno.json>", dependencies: [...] }] /* compilerOptions.types */, redirects: { "jsr:/@std/path@^1.1.2/join": "https://jsr.io/@std/path/1.1.6/join.ts", ... }, packages: { "@fresh/core@^2.3.3": "@fresh/core@2.3.3", ... }, npmPackages?: {...} }`. Example resolved deps of `routes/index.tsx`: `fresh/runtime` → `jsr:/@fresh/core@^2.3.3/runtime` (then `redirects` → `https://jsr.io/@fresh/core/2.3.3/src/runtime/shared.ts`), `../islands/Counter.tsx` → `file://.../islands/Counter.tsx`, `preact/jsx-runtime` → node_modules path (auto-injected by `jsx: precompile`/`jsxImportSource`). For the 1.x project: `$fresh/server.ts` → `https://.../fresh/1.7.3/server.ts`, `preact` → `https://esm.sh/preact@10.22.0`, and `fresh.gen.ts` lists every route/island as a dependency (a convenient manifest). Docs: https://docs.deno.com/runtime/reference/cli/info/ (`--json` "UNSTABLE").
- `@deno/loader` under Node (verified): `new Workspace({ configPath: "<root>/deno.json", platform: "browser"|"node", noConfig?, noLock?, nodeConditions?, preserveJsx?, noTranspile?, cachedOnly?, debug? })`, `const loader = await ws.createLoader(); await loader.addEntrypoints([fileUrl]); await loader.resolve(spec, referrerUrl, ResolutionMode.Import)` → `"fresh"` → `https://jsr.io/@fresh/core/2.3.3/src/mod.ts`, `"fresh/runtime"` → `https://jsr.io/@fresh/core/2.3.3/src/runtime/shared.ts`, `"@/utils.ts"` → `file://…/utils.ts`, `"npm:vite"` → `file://…/node_modules/.deno/vite@7.3.6/…/index.js`, `"jsr:@std/path@^1/join"` → `https://jsr.io/@std/path/1.1.6/join.ts`, `"node:fs"` → `node:fs`; `loader.load(url, RequestedModuleType.Default)` → `{ kind: "module", specifier, mediaType, code (bytes), sourceMap }`. `resolveSync` may return an intermediate `jsr:/…` specifier (use the async `resolve`). It fetches from jsr.io/npm on demand (respects `cachedOnly`). https://jsr.io/@deno/loader
- Practical recommendation for fresh-mcp: parse each file with oxc-parser (or the TS API) to get exports (`default`, `handler`/`handlers`, `config`, `css`, function exports of islands), JSX attributes (`f-client-nav`, `onClick` in routes), and import specifiers; resolve specifiers with a two-tier strategy — (1) local: apply `deno.json` `imports` yourself (exact key match, then longest prefix match for keys ending in `/`, e.g. `@/`, `$fresh/`, `$std/`; also honour top-level `"importMap": "./path.json"` and `deno.jsonc`), relative paths, and `file:`; (2) remote (`jsr:`/`npm:`/`https:`): either `@deno/loader` (works in Node, no Deno binary) or `deno info --json` when Deno is available; cache results. Reproduce the crawler exactly: extensions `tsx|jsx|ts|js`, ignore `/[._]test\.(?:[tj]sx?|[mc][tj]s)$/`, `(_…)` dirs excluded, `(_islands)` = islands, `_middleware/_layout/_app/_404/_500/_error` special names, `pathToPattern` as quoted in §2.2, and the 2.x `code.includes("routeOverride")` eager-load quirk.

---

## Unverified / caveats
- Whether the `main`-branch docs' "Fresh 2.4+" WebSocket-under-Vite note implies other 2.4 features are documented but unreleased; APIs in this report were cross-checked against the published 2.3.3 source, but doc pages fetched from `main` may be slightly ahead.
- `@deno/graph` under Node / its handling of `jsr:`/`npm:` in the JS API (JSR page says Deno only).
- The apparent `_500` nested-pattern slicing bug in `fs_crawl.ts` (code-reading only).
- Quality/maintenance of community `deno_ast`/swc wasm packages found by search (`@denext/swc`, `@deco/deno-ast-wasm`, `@jsz/swc`).
- `deno lsp` import-map/jsr/npm behaviour was inferred from the Deno docs ("resolve modules as the Deno CLI does") and from `deno check` succeeding; I did not drive the LSP protocol directly.

Primary sources used: https://usefresh.dev/docs/{getting-started,concepts/*,advanced/*,plugins/*,migration-guide,testing} (repo `docs/latest/**`), https://usefresh.dev/docs/1.x/** (repo `docs/1.x/**`), https://raw.githubusercontent.com/denoland/fresh/main/packages/{fresh,plugin-vite,init,update}/…, https://jsr.io/@fresh/core/2.3.3/src/…, https://raw.githubusercontent.com/denoland/fresh/1.7.3/{init.ts,server.ts,runtime.ts,dev.ts,src/**}, https://raw.githubusercontent.com/denoland/fresh/main/versions.json, https://jsr.io/@fresh/{core,init,plugin-vite}, https://jsr.io/@deno/{loader,graph}, https://docs.deno.com/lint/rules/, https://docs.deno.com/lint/rules/fresh-handler-export, https://docs.deno.com/lint/rules/fresh-server-event-handlers, https://docs.deno.com/runtime/reference/cli/info/, https://docs.deno.com/runtime/reference/vscode/, https://docs.deno.com/runtime/reference/lsp_integration/, https://docs.deno.com/runtime/reference/lint_plugins/, https://raw.githubusercontent.com/denoland/deno_graph/main/js/README.md, https://raw.githubusercontent.com/oxc-project/oxc/main/napi/parser/README.md, https://github.com/microsoft/TypeScript/issues/43326.