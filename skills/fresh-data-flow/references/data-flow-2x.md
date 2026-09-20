# Data flow — Fresh 2.x reference (2.3.3)

Sources: `packages/fresh/src/{handlers,define,context,render,fs_routes,segments}.ts`, `jsonify/stringify.ts`; Fresh docs `concepts/{routing,file-routing,middleware,layouts,app-wrapper,error-pages}`, `advanced/{define,serialization,head,view-transitions,websockets}`. Every API below is present in the published `@fresh/core@2.3.3`.

## 1. Handler and page

```tsx
import { page, HttpError } from "fresh";
import { define } from "../../utils.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const post = await loadPost(ctx.params.slug);     // server side; any import is fine here
    if (!post) throw new HttpError(404);
    return page({ post }, { headers: { "cache-control": "no-store" } });
  },
});

export default define.page<typeof handler>(function Post({ data }) {
  return <article><h1>{data.post.title}</h1></article>;
});
```

- `RouteHandler<Data, State> = HandlerFn | HandlerByMethod`; `HandlerFn = (ctx: Context<State>) => Response | PageResponse<Data> | Promise<...>`; `HandlerByMethod = { [M in Method]?: HandlerFn }`; `Method = "HEAD" | "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | "OPTIONS"` (R004 otherwise).
- Export `handlers` (preferred) or `handler`; `handlers` wins when both exist. A function handler with two parameters throws `Handlers must only have one argument` (R012).
- `page(data, { headers, status })` returns `PageResponse<T> { data, headers?, status? }`; returning `{ data, headers, status }` directly is equivalent.
- A missing method answers 405; `HEAD` falls back to `GET`.
- `define.page<typeof handler>` types `data` from the handler's `PageResponse`. `define.*` are identity functions; the docs' `define.handler()` is a typo for `define.handlers`.
- `ctx.render(vnode, init?, layoutConfig?)` renders a vnode directly, composing layouts and the app wrapper and adding `<!DOCTYPE html>`; use it from a handler or middleware when the page component is not the right shape.
- An async page component may return `Response` or JSX.

## 2. `Context` and `PageProps`

`Context<State>`: `config, url, req, route, params, state, data, error, info, isPartial, next(), Component`; methods `redirect(pathOrUrl, status = 302)`, `render(...)`, `text()`, `html()`, `json()` (= `Response.json`), `stream(iterable, init?)`, `upgrade(...)`. `FreshContext` is a deprecated alias.

`PageProps<Data, State> = Pick<Context, "config" | "url" | "req" | "params" | "info" | "state" | "isPartial" | "Component" | "error" | "route"> & { data: Data }` (fresh source: render.ts).

## 3. `ctx.state` from middleware

```ts
// utils.ts
import { createDefine } from "fresh";
export interface State { user: { id: string } | null }
export const define = createDefine<State>();

// routes/_middleware.ts
import { define } from "../utils.ts";
export default define.middleware(async (ctx) => {
  ctx.state.user = await userFromCookie(ctx.req);
  return await ctx.next();
});
```

`new App<State>()` in `main.ts` uses the same `State`. A file that calls `createDefine` itself, or imports `define` from anywhere but the project's `utils.ts`, drifts (R010). Globals registered with `app.use()` in `main.ts` run in registration order before the file routes; the scaffold sets `ctx.state.shared = "hello"` that way.

## 4. Forms

```ts
export const handler = define.handlers({
  async POST(ctx) {
    const form = await ctx.req.formData();
    const title = String(form.get("title") ?? "");
    if (!title) return new Response("title required", { status: 400 });
    await save(title);
    return ctx.redirect("/posts");
  },
});
```

- `ctx.req` is the `Request`; validate at this boundary.
- `ctx.redirect(path, status = 302)` collapses `//` (open-redirect guard) and preserves the `fresh-partial` param.

## 5. Not found and errors (fresh source: segments.ts; Fresh docs: error-pages)

- `throw new HttpError(404)` anywhere in the chain. `_error.tsx` (or `app.onError(path, ...)`) is per segment and handles every error; check `ctx.error instanceof HttpError` to read the status. `_404.tsx` (or `app.notFound()`) is root-only and used only when `HttpError.status === 404`. `_500.tsx` is still recognised.
- Error route files may export `component`/`default`, `config`, `css`, `handler`.

## 6. Page → island props

Accepted: `null`, `undefined`, boolean, number (incl. `NaN`, `±Infinity`, `-0`), bigint, string, arrays, plain objects, `Uint8Array`, `URL`, `Date`, `RegExp`, `Set`, `Map`, `Temporal.*`, `Signal` (via `.peek()`), computed signals, JSX anywhere, circular refs. Rejected: functions (`Serializing functions is not supported`), class instances, `Symbol`, `WeakMap`/`WeakSet`, streams, promises (I002). Full table in `../../fresh-islands/references/serialization.md`.

## 7. Partials and view transitions

`import { Partial } from "fresh/runtime"`; `<Partial name="content" mode="replace | prepend | append">`; enable with `f-client-nav` on an ancestor (`f-client-nav={false}` opts a subtree out); `f-partial="/partials/x"` on `<a>`, `<button>`, `<form>`; partial requests carry `?fresh-partial=true` (`PARTIAL_SEARCH_PARAM`) and `ctx.isPartial`; `f-view-transition` next to `f-client-nav` enables view transitions (`VIEW_TRANSITION_ATTR`); `_freshIndicator` exists for loading state. Partial routes usually set `config = { skipAppWrapper: true, skipInheritedLayouts: true }`.

## 8. Layouts and the app wrapper

- `routes/_layout.tsx`: `export default define.layout(({ Component, state, url }) => ...)`, async allowed, may return a `Response`; one per directory; `(group)/_layout.tsx` scopes without touching the URL. A `handler` export is ignored with a warning (R015).
- `routes/_app.tsx`: `export default define.page(function App({ Component }) { return <html>...<Component />...</html>; })`; only one per App (R016 without a default export).
- `LayoutConfig { skipInheritedLayouts, skipAppWrapper }` on a layout; the same keys in `RouteConfig` apply at render time. `app.layout("/admin/*", AdminLayout, config)` and `app.appWrapper(C)` are the programmatic forms.

## 9. Per-route CSS, `<Head>`, WebSockets

- `export const css = ["./assets/dashboard.css"]` loads extra CSS for that route.
- `<Head>` from `fresh/runtime` works in routes and islands; the base shell lives in `_app.tsx`.
- `ctx.upgrade(handlers, options?)` → `Response` (managed; `{ open, message, close, error }`, `idleTimeout` default 120) or `ctx.upgrade(options?)` → `{ socket, response }`; `app.ws(path, handlers)` registers a GET route that upgrades. The `main`-branch docs note that WS under the Vite dev server needs "Fresh 2.4+ and Deno 2.8+".

## Validator IDs

R002, R004, R010, R012, R015, R016, I002, B001, C006, C008 — see `../../_shared/references/rules.md`.
