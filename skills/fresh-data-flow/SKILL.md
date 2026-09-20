---
name: fresh-data-flow
description: >-
  How data moves through a Deno Fresh request (1.x and 2.x): handler to page
  (ctx.render(data) versus page(data) and define.page<typeof handler>), page to island
  props and what serializes, ctx.state set by middleware, forms with POST and redirects,
  not-found and error responses, and partials. Use when a page needs data, a form must be
  handled, an island receives the wrong props, ctx.state is undefined, or a task mentions
  handlers, PageProps, loaders, fetch in a route, or form submission. Query fresh_route
  and fresh_islands before editing.
user-invocable: false
paths: "routes/**"
---

# fresh-data-flow

One request, one chain: `app → layouts → middlewares → handler → page → islands`. Data
enters at the handler (or at a middleware, through `ctx.state`), reaches the page as
`data`, and reaches islands as serialized props. Each hop has a version-specific shape,
and the island hop has a serialization limit no other hop has.

References: `references/data-flow-1x.md`, `references/data-flow-2x.md`,
`../fresh-islands/references/serialization.md`, `../_shared/references/versions.md`.

## Before touching anything

| Question | Call |
|---|---|
| Version (the handler/page contract differs) | `fresh_project(workspace="/abs/path")` |
| What does this page receive today, and from where? | `fresh_route(workspace="/abs/path", file="routes/blog/[slug].tsx")` — `passes_data` (the `Data` type when literal), the middlewares in the chain that set `ctx.state` |
| Which middlewares run before this URL, in what order? | `fresh_trace(workspace="/abs/path", path="/blog/hello", method="POST")` — `chain[]` |
| What will the island get, and does it serialize? | `fresh_islands(workspace="/abs/path", name="LikeButton")` — `props` with serializability |
| Does the handler share a module with an island? | `fresh_boundaries(workspace="/abs/path", only_violations=true)` |

## Decision rules

### Handler → page

| | 1.x | 2.x |
|---|---|---|
| declare | `export const handler: Handlers<Data> = { GET(req, ctx) {...} }` | `export const handler = define.handlers({ GET(ctx) {...} })` (`handlers` also accepted and wins) |
| hand data to the page | `return ctx.render(data)` | `return page(data, { headers, status })` or `return { data, headers, status }` |
| type the page | `export default function Page({ data }: PageProps<Data>)` | `export default define.page<typeof handler>(function Page({ data }) {...})` |
| render something else | return a `Response` | return a `Response`; `ctx.render(vnode, init?, layoutConfig?)` renders a vnode directly, with layouts and app wrapper |
| async page, no handler | `export default async function Page(req, ctx: RouteContext)` | async `define.page`; may return `Response` or JSX |
| no method matches | `GET` synthesised to render, `HEAD` from `GET` | 405; `HEAD` falls back to `GET` |

`define.*` are identity functions (fresh source: define.ts); they exist for the `State`
and `Data` types. The docs mention `define.handler()`; the API is `define.handlers`.

### Middleware → page: `ctx.state`

- Type it once: 2.x `createDefine<State>()` in `utils.ts` plus `new App<State>()` in
  `main.ts` (R010 when a file uses a different `define`); 1.x `Handlers<Data, State>`,
  `MiddlewareHandler<State>`, `PageProps<Data, State>`.
- A page sees only state set by a middleware in its chain; `fresh_trace` shows the chain.
  2.x `app.use()` middlewares in `main.ts` run in registration order before the file
  routes (the scaffold sets `ctx.state.shared` that way).

### Forms

- Render the form in the page (`GET`), handle it in `POST` of the same file, then redirect
  so a refresh does not resubmit: 2.x `return ctx.redirect("/blog/hello")` (302 by
  default; collapses `//` against open redirects); 1.x return a redirect `Response`.
- Read the body with `ctx.req.formData()` (2.x: `req` lives on the context) or
  `req.formData()` (1.x: first argument). Validate at this boundary.
- Method routing is by object key; unknown keys are R004.

### Not found and errors

- 2.x: `throw new HttpError(404)` from a handler or page; `_error.tsx` (per segment) or
  `_404.tsx` (root only, used only when the status is 404) renders it; check
  `ctx.error instanceof HttpError` in `_error.tsx`.
- 1.x: `return ctx.renderNotFound(data?)`; `_404.tsx` and `_500.tsx`.

### Page → island

Island props are serialized into the HTML. Pass data, signals and JSX; never functions,
class instances, DB handles, the request, or the whole `ctx` (I002). 1.x also rejects
`Date`, `Map`, `Set`, `RegExp`, `URL`: convert to strings or plain objects in the handler.
Shape the prop in the handler, not in the island.

### Partials

`<Partial name="..." mode="replace|prepend|append">` from `fresh/runtime` (1.x:
`$fresh/runtime.ts`); enable with `f-client-nav` on an ancestor; `f-partial="/partials/x"`
on `<a>`, `<button>`, `<form>`. The request carries `?fresh-partial=true`, visible as
`ctx.isPartial`; partial routes usually set
`config = { skipAppWrapper: true, skipInheritedLayouts: true }`. 2.x adds
`f-view-transition`.

## Minimal change

1. Add the method to the existing handler object rather than a second export.
2. Compute and shape data in the handler (server side, any import allowed); the page only
   renders; islands only interact.
3. Keep `Data` a literal type so `fresh_route.passes_data` can read it and `deno check`
   can verify the page against it.
4. Validate: `fresh_validate(workspace="/abs/path", categories=["routes", "islands"],
   files=["routes/blog/[slug].tsx"])`, then `deno check`, then `deno lint` (tag `fresh`).

## Traps

| Trap | ID |
|---|---|
| `(req, ctx)` handler in 2.x | R012 |
| `handlers` export in 1.x | R013 |
| Unknown method key | R004 |
| API route with no path for unsupported methods (405) | C006 |
| Callback, class instance, or (1.x) `Date` passed to an island | I002 |
| Handler helper imported by an island (DB in the bundle) | B001 |
| 2.x `define` from a second `createDefine` (State drift) | R010 |

## Precedence

The project's existing conventions outrank this skill; the user's request and safety
outrank both (`engineering-baseline`). If the repo fetches in pages, has its own
data-access module or its own redirect helper, keep that shape.
