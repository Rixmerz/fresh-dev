---
name: fresh-middleware
description: >-
  How middleware composes in a Deno Fresh project (1.x and 2.x): root-to-leaf order of
  _middleware.ts files, 2.x app.use() globals in main.ts and the position of
  staticFiles(), ctx.next(), typed ctx.state, the 2.x built-ins (cors, csrf, csp,
  ipFilter, trailingSlashes), error routes, and the export shapes each version accepts.
  Use when editing routes/**/_middleware.ts or main.ts, adding auth, logging, CORS or
  CSRF, or when a middleware does not run, runs twice, or runs for static files. Query
  fresh_trace and fresh_routes(kind="middleware") before editing.
user-invocable: false
paths: "routes/**/_middleware.ts,main.ts"
---

# fresh-middleware

Middleware is an onion by directory. The question is never "does it run" but "for which
URLs, in which position, and what does it hand to the next layer". Ask before editing.

References: `references/middleware.md`, `../_shared/references/versions.md`.

## Before touching anything

| Question | Call |
|---|---|
| Version (export shape, signature, globals) | `fresh_project(workspace="/abs/path")` |
| Which middlewares guard this URL, in order? | `fresh_trace(workspace="/abs/path", path="/admin/users", method="POST")` — `chain[]`, each `middleware` with its scope; `staticMatch` |
| Which routes fall under this middleware's scope? | `fresh_routes(workspace="/abs/path", prefix="/admin")` — `middlewares[]` per route; `fresh_impact(workspace="/abs/path", files=["routes/admin/_middleware.ts"])` |
| Is a global (2.x `app.use`) already doing this? | `fresh_route(workspace="/abs/path", file="routes/admin/index.tsx")` — the `app`-level entries in the chain (`confidence: inferred` when lazily imported) |
| Does it touch browser globals, or is it imported by an island? | `fresh_boundaries(workspace="/abs/path", only_violations=true)` |

## Decision rules

### Order (both versions)

Root → leaf: `routes/_middleware.ts` runs before `routes/admin/_middleware.ts`, which
runs before the handler. Each middleware calls `ctx.next()` to continue and may return
its own `Response` to stop. An array export registers several middlewares for one scope.

### 2.x (fresh source: segments.ts, fs_routes.ts, app.ts)

- `main.ts`: `app.use(mw)` and `app.use(path, mw)` register globals in **top-to-bottom
  order**, before `app.fsRoutes()` inserts the file routes. `app.use(staticFiles())` is
  required (R020) and its position decides whether static files bypass later middleware.
- Per segment the tree first installs that segment's app wrapper, layout and error route,
  then runs the segment's own middlewares; globals registered earlier run first.
- `_middleware.ts` exports: `export default define.middleware((ctx) => ...)`, or
  `export default [mw1, mw2]`, or `export const handler`/`handlers` = fn or array. An
  object by method (`{ GET() {} }`) is rejected at startup (R014). Signature `(ctx)`
  (R012).
- Middleware may be lazy: `app.use("/x", async () => (await import("./mw.ts")).default)`;
  `fresh_trace` marks such edges `inferred`.
- Built-ins from `"fresh"`: `staticFiles()`, `trailingSlashes("always"|"never")`,
  `cors(options)`, `csrf(options)`, `csp({ reportOnly, reportTo, csp, useNonce })`,
  `ipFilter({ denyList, allowList }, { onBlocked })`. Reach for them before writing your
  own.
- Errors: `_error.tsx` or `app.onError(path, ...)` per segment; `_404.tsx` or
  `app.notFound()` root only, used only for an `HttpError` with status 404. Throw
  `HttpError` from middleware to route into them.
- `ctx.state` is typed by `new App<State>()` and `createDefine<State>()` (R010 if a
  middleware uses a different `define`). `ctx.redirect(path, status = 302)` collapses
  `//`.
- `_layout.tsx` with a `handler` export only warns and is ignored (R015).
- Vite flavor: `main.ts` must not call `app.listen()` (R017: `AddrInUse` under
  `deno task dev`/`start`).

### 1.x (fresh source: fs_extract.ts; Fresh docs 1.x: middleware)

- `_middleware.ts` exports `handler: MiddlewareHandler | MiddlewareHandler[]` with
  `(req, ctx)`; no `handler` export is R005 (R005 also covers a 2.x file with neither
  `default` nor `handler(s)`).
- `ctx.destination` (`internal | static | route | notFound`) lets a middleware skip asset
  and internal requests; static files are served before routes regardless.
- No global middleware in `main.ts`; plugins in `fresh.config.ts` inject middlewares,
  merged as synthetic `./routes/<path>/_middleware.ts` entries.
- No built-in collection; `router.trailingSlash` is a config option.

### What a middleware may touch

A middleware is server code: `Deno.*`, drivers and `node:` are fine there. `window`,
`document`, `localStorage` without an `IS_BROWSER` guard are B002. A middleware helper
imported by an island drags the server into the bundle (B001): keep helpers in a
server-only module.

## Minimal change

1. Pick the narrowest directory that covers every route you mean and no other
   (`fresh_routes(prefix=...)` lists them); use `(group)/_middleware.ts` to scope without
   changing URLs.
2. Prefer a 2.x built-in over a hand-written equivalent; prefer adding to an existing
   array over a second file.
3. Set `ctx.state` fields declared in `State`; do not mutate the request.
4. Validate: `fresh_validate(workspace="/abs/path", categories=["routes", "boundaries"],
   files=["routes/admin/_middleware.ts"])`, `deno check` (2.x: include `main.ts`),
   `deno lint`. Re-run `fresh_trace` on one URL inside and one outside the scope and
   compare `chain[]`.

## Traps

| Trap | ID |
|---|---|
| `_middleware.ts` with no recognised export | R005 |
| 2.x by-method object in middleware | R014 |
| 2.x `(req, ctx)` signature | R012 |
| 2.x Vite `main.ts` calling `app.listen()` | R017 |
| 2.x missing `staticFiles()` | R020 |
| 2.x `_layout.tsx` with `handler` | R015 |
| Browser global in server code | B002 |
| Middleware helper reachable from an island | B001 |

## Precedence

The project's existing conventions outrank this skill; the user's request and safety
outrank both (`engineering-baseline`). Auth and authz are safety: deny by default, and
never loosen an existing guard to satisfy a preference stated here.
