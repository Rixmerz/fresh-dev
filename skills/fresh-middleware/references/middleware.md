# Middleware — reference (both versions)

Sources: 2.x `packages/fresh/src/{fs_routes,segments,app,mod,middlewares/*}.ts`, Fresh docs `concepts/{middleware,app}`, `plugins/{csp,ip-filter}`; 1.x `1.7.3/src/server/{types,fs_extract}.ts`, Fresh docs 1.x `concepts/middleware`.

## 1. Fresh 2.x

### Types and file shapes

- `Middleware<State> = (ctx: Context<State>) => Response | Promise<Response>`; `MiddlewareFn` is a deprecated alias; `MaybeLazyMiddleware` may be an async function returning a middleware.
- `_middleware.ts` (fresh source: fs_routes.ts, `handlers ?? mod.default`):

  ```ts
  export default define.middleware(async (ctx) => { /* ... */ return await ctx.next(); });
  export default [mw1, mw2];
  export const handler = (ctx) => ctx.next();        // or `handlers`; a function or an array
  ```

  A by-method object (`{ GET(ctx) {} }`) is rejected: "Middleware does not support object handlers with GET, POST..." (R014). Two parameters → R012. No recognised export → R005.
- `ctx.next()` continues the onion; returning a `Response` short-circuits.

### Execution order (fresh source: segments.ts `segmentToMiddlewares`)

1. `app.use()` globals in `main.ts` run in registration order (top to bottom), before routes registered later. `app.use(path, ...mw)` scopes a global to a path prefix.
2. The segment tree is walked root → nested. For each segment a synthetic middleware first installs that segment's app wrapper, layout and error route, then the segment's own `_middleware.ts` middlewares run.
3. The route handler runs last. Layouts have accumulated outer → inner; `skipInheritedLayouts` resets the list to the current layout and `skipAppWrapper` drops the wrapper; a route's `RouteConfig` does the same at render time (`renderRoute`).
4. Error routes (`_error.tsx`, `app.onError(path)`) are per segment; 404 (`_404.tsx`, `app.notFound()`) is root-only and only used when the thrown `HttpError.status === 404`.

The scaffold's `main.ts` shows the shape:

```ts
export const app = new App<State>();
app.use(staticFiles());
app.use(async (ctx) => { ctx.state.shared = "hello"; return await ctx.next(); });
app.get("/api2/:name", (ctx) => new Response(`Hello, ${ctx.params.name}`));
const exampleLoggerMiddleware = define.middleware((ctx) => { console.log(`${ctx.req.method} ${ctx.req.url}`); return ctx.next(); });
app.use(exampleLoggerMiddleware);
app.fsRoutes();
```

`staticFiles()` first means static requests never reach the logger; register it later and they do. Without `staticFiles()` island JS and `static/` are not served (R020). No `app.listen()` in Vite mode (R017).

### Lazy middleware

`app.use("/x", async () => (await import("./mw.ts")).default)`. `fresh_trace` and `fresh_route` mark the edge `confidence: inferred` because the target is resolved at runtime.

### Built-ins exported from `"fresh"` (fresh source: mod.ts)

| Middleware | Notes (source and docs) |
|---|---|
| `staticFiles()` | serves `staticDir` (string or list; first match wins); ETag and immutable caching when `?__frsh_c=<BUILD_ID>` matches |
| `trailingSlashes("always" \| "never")` | |
| `cors(options)` | `CORSOptions` |
| `csrf(options)` | `CsrfOptions` |
| `csp({ reportOnly?, reportTo?, csp?: string[], useNonce? })` | with `useNonce`, Fresh injects `nonce` on inline `<script>`/`<style>` and passes it via `NONCE_SYMBOL` on the Response; per-route `RouteConfig.csp` also exists |
| `ipFilter({ denyList, allowList }, { onBlocked })` | |

Also exported from `"fresh"`: `HttpError`, `page`, `createDefine`, `App`. `new App({ trustProxy: true })` honours `X-Forwarded-Proto`/`X-Forwarded-Host`.

### Programmatic routes that behave like middleware

`app.get/post/patch/put/delete/head/all(path, ...middlewares)` (no `.options()` in source), `app.route(path, route | lazy, config?)`, `app.layout(path, C, { skipInheritedLayouts?, skipAppWrapper? })`, `app.appWrapper(C)`, `app.notFound(x)` (root only), `app.onError(path, x)` (per path), `app.ws(path, handlers, options?)`, `app.mountApp(path, app)`, `app.fsRoutes(pattern = "*")` (mountable under a sub-path; not nestable).

### Typed state

`new App<State>()` and `createDefine<State>()` from `utils.ts` share `State`; a middleware importing `define` from elsewhere drifts (R010). `ctx.redirect(path, status = 302)` collapses `//`.

## 2. Fresh 1.x

- `routes/_middleware.ts` exports `handler: MiddlewareHandler | MiddlewareHandler[]` with `(req, ctx)`:

  ```ts
  export async function handler(req: Request, ctx: FreshContext) {
    ctx.state.requestId = crypto.randomUUID();
    return await ctx.next();
  }
  export const handler = [mw1, mw2];   // alternative shape
  ```

  No `handler` export → R005.
- Order: least specific first — `routes/_middleware.ts` → `routes/admin/_middleware.ts` → handler.
- `ctx.destination` (`"internal" | "static" | "route" | "notFound"`) lets a middleware skip asset or internal requests; `static/` is served before routes regardless.
- `ctx.state` is shared down the chain; `ctx.params` are available. Type with `MiddlewareHandler<State>` and `Handlers<Data, State>`.
- No global middleware in `main.ts`; plugins (`fresh.config.ts`) inject middlewares, merged as synthetic `./routes/<path>/_middleware.ts` entries.
- No built-in middleware collection; `router.trailingSlash` is a `FreshConfig` option.

## 3. Both versions: what to check after an edit

1. `fresh_trace(workspace="/abs/path", path="<inside scope>")` and `fresh_trace(workspace="/abs/path", path="<outside scope>")`: the middleware appears only in the first `chain[]`, at the expected position.
2. `fresh_routes(workspace="/abs/path", prefix="<scope>")`: every route lists it in `middlewares[]`.
3. `fresh_boundaries(workspace="/abs/path", only_violations=true)`: no island reaches a helper the middleware imports (B001); no `window`/`document` in the middleware (B002).
4. `fresh_validate(workspace="/abs/path", categories=["routes", "boundaries"], files=[...])`, `deno check`, `deno lint`.

## Validator IDs

R005, R010, R012, R014, R015, R017, R020, B001, B002 — see `../../_shared/references/rules.md`.
