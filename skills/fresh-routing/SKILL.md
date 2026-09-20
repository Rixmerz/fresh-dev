---
name: fresh-routing
description: >-
  How to reason about routes in a Deno Fresh project (1.x and 2.x): file name to URL
  pattern, static-over-dynamic precedence, route groups, routeOverride, _layout and
  _middleware scope, API routes versus pages, and the handler export shape each version
  accepts. Use when adding, moving, renaming or debugging anything under routes/, when a
  URL returns 404 or hits the wrong file, or when a task mentions a route, endpoint, page,
  [slug], catch-all or route group. Query fresh_routes, fresh_route and fresh_trace before
  editing.
user-invocable: false
paths: "routes/**"
---

# fresh-routing

A route is a file whose path is a URL pattern. The mistakes are rarely in the handler;
they are in the name, the folder, the export shape, or the version. Ask first.

References: `references/routing-1x.md`, `references/routing-2x.md`,
`../_shared/references/versions.md`.

## Before touching anything

| Question | Call |
|---|---|
| Which version? (`handler` vs `handlers`, `(req, ctx)` vs `(ctx)`) | `fresh_project(workspace="/abs/path")` |
| Which file serves this URL today, through which layouts and middleware? | `fresh_trace(workspace="/abs/path", path="/blog/hello", method="GET")` — `matched`, `chain[]`, `staticMatch`, `notFound` |
| Is the URL I want already taken or shadowed by a static file? | the same call, before creating the file (R006) |
| What surrounds the new route: siblings, layouts, middlewares, groups? | `fresh_routes(workspace="/abs/path", prefix="/blog", summary_only=true)` |
| Everything about one route before I edit it | `fresh_route(workspace="/abs/path", file="routes/blog/[slug].tsx")` — chain, `passes_data`, `hydrates`, `tests` |
| What breaks if I move or rename it? | `fresh_impact(workspace="/abs/path", files=["routes/blog/[slug].tsx"])`; `fresh_usages` on anything it exports |

## Decision rules

### File name → pattern (same algorithm in both versions; fresh source: router.ts, fs_extract.ts)

| File | Pattern |
|---|---|
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `blog/index.tsx` | `/blog` |
| `blog/[slug].tsx` | `/blog/:slug` |
| `blog/[slug]/comments.tsx` | `/blog/:slug/comments` |
| `old/[...path].tsx` | `/old/:path*` |
| `docs/[[version]]/index.tsx` | `/docs{/:version}?` |
| `[[name]].tsx` | `/{:name}?` |
| `(marketing)/pricing.tsx` | `/pricing` (the group never appears in the URL) |

Mixed literals are allowed (`[id]-asdf`, `[id]@[bar]`); adjacent `][` throws; `[[opt]]`
must be a whole segment; `config.routeOverride` replaces the whole pattern (R009 when it
is not a string literal). Patterns are `URLPattern` syntax: **static beats dynamic,
dynamic resolves in registration order** (Fresh docs: routing).

### What the crawler reads (both versions; fresh source: fs_crawl.ts, dev/mod.ts)

- Extensions `tsx`, `jsx`, `ts`, `js` only (R018). Files matching
  `/[._]test\.(?:[tj]sx?|[mc][tj]s)$/` are skipped (R019).
- Any `(_xxx)/` directory is excluded from routes; `(_islands)/` registers islands;
  `(_components)/` is just an ignored folder.
- Special names: `_app`, `_layout`, `_middleware`, `_404`, `_500`; `_error` in 2.x only.
  Any other `_`-prefixed file at the routes root is ignored in 1.x.

### Registration order (what `fresh_trace` reproduces)

- 2.x: `_app` first; then per segment `_middleware` > `_layout` and other `_` > `_error`
  > `index` > literal > `(group)` > `[param]` > `[...rest]`.
- 1.x: `_app` first; `_middleware` > `_` > literal > `[` > `[...`. Two files that differ
  only by extension raise `Route conflict detected` at manifest time (R006).

### API route or page?

- `.ts` with only a `handler`/`handlers` export: API route returning `Response`. JSX in a
  `.ts` route, or a `default` returning JSX from one, is R003.
- `.tsx` with a `default` component: page; add `handler(s)` only when the page needs data
  or non-GET methods (`fresh-data-flow`).
- Object handlers accept only `HEAD|GET|POST|PATCH|PUT|DELETE|OPTIONS` keys (R004). 2.x
  answers 405 for a missing method and serves `HEAD` from `GET`; 1.x synthesises `GET`
  (render) and `HEAD` when a component exists and no `GET` is defined.

### Version-specific export shape

| | 1.x | 2.x |
|---|---|---|
| handler export | `handler` (`handlers` throws at startup, R013) | `handlers` preferred, `handler` accepted; `handlers` wins |
| signature | `(req, ctx)` | `(ctx)`; two parameters is a startup error (R012) |
| valid route file | `default` or `handler` | `default` function, or `config` object, or `handler(s)`; otherwise `Could not find relevant exports` (R002) |
| config | `routeOverride, csp, skipInheritedLayouts, skipAppWrapper` | same plus `methods`; `export const css = [...]` adds per-route CSS |
| helpers | `defineRoute`, `defineLayout`, `defineApp` from `$fresh/server.ts` | `define.handlers/page/layout/middleware` from the project's `utils.ts` (R010 when a file gets `define` elsewhere) |
| route table | `fresh.gen.ts`; `dev.ts` regenerates it on start (R008 when disk and manifest disagree) | none; crawl at dev/build, `app.fsRoutes()` inserts it (mountable under a sub-path, not nestable) |
| programmatic routes | plugins in `fresh.config.ts` | `app.get/post/...`, `app.route`, `app.layout`, `app.mountApp` in `main.ts`, top to bottom |

2.x quirk: the crawler decides eager vs lazy loading with the literal substring test
`code.includes("routeOverride")` (fresh source: fs_crawl.ts). A comment containing the
word changes loading and nothing else.

## Minimal change

1. `fresh_trace` the target URL. If `matched` is a route, you are about to shadow or
   conflict (R006/R007). Static files win over routes always in 1.x, and in 2.x when
   `staticFiles()` is registered before `fsRoutes()`: read `staticMatch`.
2. Put the file where the layouts and middleware you want already apply
   (`fresh_routes(prefix=...)` shows `layouts[]` and `middlewares[]`); use a `(group)/`
   folder to share a layout without changing the URL.
3. Copy the export shape of a sibling route rather than writing one from memory.
4. Validate: `fresh_validate(workspace="/abs/path", categories=["routes"], files=[...])`,
   then `deno check`, then `deno lint` (tag `fresh`). 1.x: run `deno task manifest` or
   start `dev.ts` so `fresh.gen.ts` includes the new file, then re-run `fresh_trace`.

## Traps

| Trap | ID |
|---|---|
| Space, capitalised dynamic segment, empty `[]`, `[...rest]` not last | R001 |
| Route file exporting neither `handler(s)` nor `default` | R002 |
| JSX in a `.ts` route | R003 |
| Unknown method key in an object handler | R004 |
| `foo.tsx` next to `foo/index.tsx`, or two equal `routeOverride`s | R006 |
| `[id].tsx` and `[slug].tsx` as siblings: order undefined | R007 |
| 1.x manifest out of sync | R008 |
| `routeOverride` built from an expression | R009 (`confidence: inferred`) |
| `_layout.tsx` with `skipInheritedLayouts` and no parent layout | R011 |
| `_app.tsx` without a default export | R016 |
| `.mts`/`.mjs`/`.cts` under `routes/`; a test-pattern name expected to be a route | R018, R019 |

## Precedence

The project's existing conventions outrank this skill; the user's request and safety
outrank both (`engineering-baseline`). If the repo already names its routes or shapes its
handlers in a way this skill would not, follow the repo.
