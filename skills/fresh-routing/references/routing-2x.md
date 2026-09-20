# Fresh 2.x routing — reference

Verified against `@fresh/core@2.3.3` (`packages/fresh/src/{dev/fs_crawl,router,fs_routes,define,context,app,segments}.ts`) and the 2.x docs (usefresh.dev/docs). The 1.x column is in `routing-1x.md`; the side-by-side view is `../../_shared/references/versions.md`.

## 1. The crawl (fresh source: fs_crawl.ts)

Used by both the Vite plugin (`crawlFsItem` from `fresh/internal-dev`) and the `Builder`.

- `walkDir(fs, dir, cb, ignore)` walks with `includeDirs: false, includeFiles: true, exts: ["tsx","jsx","ts","js"], skip: ignore`. Recursive; only those four extensions (R018). Default `ignore = [TEST_FILE_PATTERN]` = `/[._]test\.(?:[tj]sx?|[mc][tj]s)$/` (R019).
- `GROUP_REG = /[/\\]\((_[^/\\]+)\)[/\\]/`: any directory segment `(_xxx)` is excluded from routes; if it is exactly `(_islands)` the file is registered as an island. `(_components)` is just an ignored folder ("Fresh does not treat these files specially" — Fresh docs: file-routing).
- `id` = path relative to `routes/` minus extension, with a leading `/`. Classification by suffix: `/_middleware` → Middleware (pattern `pathToPattern(dir, {keepGroups: true})`), `/_layout` → Layout, `/_app` → App, `/_404` → NotFound, `/_error` or `/_500` → Error, else Route.
- Route: `pattern = pathToPattern(id.slice(1), {keepGroups: true})` (plus a trailing `/` for an `index` file); `routePattern = pathToPattern(id.slice(1))` (groups stripped). Then:

  ```ts
  const code = await fs.readTextFile(entry.path);
  lazy = !code.includes("routeOverride");
  ```

  A plain substring check on the file text decides eager versus lazy loading, and `overrideConfig = { methods: "ALL" }` (source comment: "TODO: We could do an AST parse here to detect the kind of handler"). A comment containing the word `routeOverride` makes the route eager.
- Files are sorted with `sortRoutePaths`: `_app` first; then per segment `_middleware` (score 6) > `_layout` and other `_` (5) > `_error` (4) > `index` (3) > literal (2) > `(group)` (between literal and `[`) > `[param]` (1) > `[...rest]` (0).
- Observation, UNVERIFIED at runtime: for `_500` the pattern is computed with `id.slice(1, -"/_error".length)` (7 characters instead of 5), so a nested `routes/x/_500.tsx` may get a truncated pattern; a root `_500.tsx` still yields `/`. Prefer `_error.tsx` for nested error pages.

## 2. `pathToPattern` (fresh source: router.ts; the same algorithm as 1.x `fs_extract.ts`)

Trailing `index` segment dropped (`index` alone → `/`); `[...rest]` → `/:rest*`; `(group)` dropped unless `keepGroups`; adjacent `][` throws `SyntaxError`; `[[opt]]` must be a full segment → `{/:opt}?`; mixed literals allowed (`[id]-asdf`, `[id]@[bar]`, `asdf[bar]`); a route starting with an optional segment and no non-optional segment → `/{:name}?`; empty → `/`.

| File | Pattern |
|---|---|
| `index.ts` | `/` |
| `about.ts` | `/about` |
| `blog/index.ts` | `/blog` |
| `blog/[slug].ts` | `/blog/:slug` |
| `blog/[slug]/comments.ts` | `/blog/:slug/comments` |
| `old/[...path].ts` | `/old/:path*` |
| `docs/[[version]]/index.ts` | `/docs{/:version}?` |
| `[[name]].ts` | `/{:name}?` |

(Fresh docs: file-routing.) Patterns are `URLPattern` syntax; static routes win over dynamic ones, dynamic ones resolve in registration order (Fresh docs: routing).

`export const config: RouteConfig = { routeOverride: "/x/:module@:version/:path*" }` replaces the file-derived pattern; `normalizeRoute` sets `config.routeOverride ??= routePattern`. A non-literal `routeOverride` cannot be analysed (R009, `confidence: inferred`); two equal ones collide (R006).

## 3. Route module exports (fresh source: fs_routes.ts)

```ts
export interface FreshFsMod<State> {
  config?: RouteConfig;
  handler?: RouteHandler<unknown, State> | HandlerFn<unknown, State>[];
  handlers?: RouteHandler<unknown, State>;
  default?: AnyComponent<PageProps<unknown, State>> | AsyncAnyComponent<PageProps<unknown, State>>;
  css?: string[];
}
```

- `isFreshFile`: valid if `typeof mod.default === "function"` (or an array, for middleware), or `config` is an object, or `handlers`/`handler` is an object or a function. Otherwise `Could not find relevant exports in: <file>` ("Route files must export a default component, a "handler" or "handlers" export, or a "config" export") — R002.
- `const handlers = mod.handlers ?? mod.handler ?? null;` — **`handlers` wins**. Then `if (typeof handlers === "function" && handlers.length > 1) throw "Handlers must only have one argument..."` — R012.
- Middleware files: `handlers ?? mod.default`; a by-method object is rejected ("Middleware does not support object handlers with GET, POST...") — R014; a single function or an array is accepted.
- Layout: needs `default`; a `handler` export triggers a warning — R015. Error (`_error`/`_500`) and NotFound (`_404`) files: `component`, `config`, `css`, `handler`. App (`_app`): `default` only — R016.
- `export const css = ["./assets/dashboard.css"]` loads extra CSS for that route (Fresh docs: file-routing).

Types (fresh source: types.ts, handlers.ts, router.ts):

```ts
export interface RouteConfig { routeOverride?: string; csp?: boolean; skipInheritedLayouts?: boolean; skipAppWrapper?: boolean; methods?: "ALL" | Method[]; }
export interface LayoutConfig { skipInheritedLayouts?: boolean; skipAppWrapper?: boolean; }
export interface Route<State> { component?: RouteComponent<State>; config?: RouteConfig; handler?: RouteHandler<unknown, State>; css?: string[]; }
export type Lazy<T> = () => Promise<T>; export type MaybeLazy<T> = T | Lazy<T>;
export type Method = "HEAD" | "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | "OPTIONS";
export type RouteHandler<Data, State> = HandlerFn<Data, State> | HandlerByMethod<Data, State>;
export type HandlerFn<Data, State> = (ctx: Context<State>) => Response | PageResponse<Data> | Promise<Response | PageResponse<Data>>;
export type HandlerByMethod<Data, State> = { [M in Method]?: HandlerFn<Data, State> };
```

`page(data, { headers, status })` returns `PageResponse<T> { data, headers?, status? }`; a handler may also return `{ data, headers, status }` directly. A missing method answers 405; `HEAD` falls back to `GET`. Keys outside `Method` are R004.

## 4. `createDefine` (fresh source: define.ts)

All four members are identity functions that exist only for the types:

```ts
export interface Define<State> {
  handlers<Data, Handlers extends RouteHandler<Data, State> = RouteHandler<Data, State>>(handlers: Handlers): typeof handlers;
  page<Handler extends RouteHandler<any, State> = never, Data = ...>(render: AnyComponent<PageProps<Data, State>>): typeof render;
  middleware<M extends Middleware<State> | Middleware<State>[]>(middleware: M): typeof middleware;
  layout(render: AnyComponent<PageProps<unknown, State>>): typeof render;
}
export function createDefine<State>(): Define<State> {
  return { handlers(h) { return h; }, page(r) { return r; }, layout(r) { return r; }, middleware(m) { return m; } };
}
```

Usage: `export const handler = define.handlers({...}); export default define.page<typeof handler>(({ data }) => ...)`. The scaffold puts `export const define = createDefine<State>()` in `utils.ts`; a file that builds its own `define` gets a different `State` (R010). The docs page `advanced/define` mentions `define.handler()`; that is a typo, the API is `define.handlers`.

## 5. `Context` (fresh source: context.ts; identical members in 2.3.3)

`readonly config: ResolvedFreshConfig; readonly url: URL; req: Request; readonly route: string | null; readonly params: Record<string, string>; readonly state: State; data: unknown; error: unknown | null; readonly info: Deno.ServeHandlerInfo; readonly isPartial: boolean; next: () => Promise<Response>; Component: FunctionComponent;`

Methods: `redirect(pathOrUrl, status = 302)` (collapses `//` to prevent open redirects; preserves the `fresh-partial` param); `render(vnode: VNode | null, init?: ResponseInit, config?: LayoutConfig)` (composes layouts and the app wrapper; adds `<!DOCTYPE html>` and a fallback `<html><head><body>`); `text()`, `html()`, `json()` (= `Response.json`), `stream(iterable, init?)`; `upgrade(options?)` → `{socket, response}` (bare) or `upgrade(handlers, options?)` → `Response` (managed; `WebSocketHandlers {open, message, close, error}`, `WebSocketUpgradeOptions {idleTimeout (default 120), protocol}`; throws `HttpError(400, "Expected a WebSocket upgrade request")`).

`FreshContext` is a deprecated alias of `Context`. `PageProps<Data, State> = Pick<Context, "config" | "url" | "req" | "params" | "info" | "state" | "isPartial" | "Component" | "error" | "route"> & { data: Data }` (fresh source: render.ts). Async page components may return `Response` or JSX.

## 6. `App` (fresh source: app.ts; `FreshConfig` in config.ts)

`new App<State>(config?: { basePath?: string; mode?: "development" | "production"; trustProxy?: boolean })`; the resolved config also has `root`. Methods (all return `this`):

- `use(...mw)` / `use(path, ...mw)`;
- `get/post/patch/put/delete/head/all(path, ...middlewares)` — **no `.options()` method exists** in the 2.3.3 source, although the routing docs list it;
- `route(path, route | lazy, config?)`;
- `fsRoutes(pattern = "*")` — "Insert file routes collected in Builder at this point"; can mount at a sub-path; nested `fsRoutes` are not supported;
- `layout(path, component, config?)`, `appWrapper(component)`;
- `notFound(routeOrMiddleware)` (root only, not nestable); `onError(path, routeOrMiddleware)` (nestable per path);
- `ws(path, handlers, options?)` (registers a GET route that upgrades); `mountApp(path, app)`;
- `handler()` → `(req, info?) => Promise<Response>`; `listen(options?)` — never in a Vite-mode `main.ts` (R017).

Middlewares and handlers may be lazy: `app.use("/x", async () => (await import("./mw.ts")).default)`. Registration order is top to bottom and matters. `fresh_trace` marks lazy edges `confidence: inferred`.

## 7. 2.3 additions confirmed in the published 2.3.3 sources

`ctx.upgrade()` and `app.ws()`; `f-view-transition` next to `f-client-nav` (`VIEW_TRANSITION_ATTR` in `runtime/shared_internal.ts`); `staticDir: string | string[]` in `fresh({ staticDir: [...] })` and `new Builder({ staticDir })` (first match wins); `csp({ reportOnly?, reportTo?, csp?: string[], useNonce? })` (with `useNonce`, Fresh injects `nonce` on inline `<script>`/`<style>`); per-route `RouteConfig.csp`; `trustProxy` (respects `X-Forwarded-Proto`/`X-Forwarded-Host`); `ipFilter({ denyList, allowList }, { onBlocked })`; `deno create @fresh/init`; `ctx.text/html/json/stream`. The `main`-branch docs note that WebSockets under the Vite dev server need "Fresh 2.4+ and Deno 2.8+"; those docs are slightly ahead of 2.3.3.

## 8. What `deno lint` says about 2.x routes

`fresh-handler-export` (tag `fresh`) insists the named export be `handler`, not `handlers`; it reflects 1.x. On a 2.x `export const handlers` it is a false positive and `fresh_validate` marks it so when merging `deno lint` output (C008). The 2.x scaffold itself uses `export const handler = define.handlers({...})`, which satisfies both.

## Validator IDs that apply here

R001, R002, R003, R004, R006, R007, R009, R010, R012, R014, R015, R016, R017, R018, R019, R020, C006, C008 — see `../../_shared/references/rules.md`.
