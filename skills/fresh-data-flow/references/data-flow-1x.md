# Data flow — Fresh 1.x reference (1.7.3)

Sources: `1.7.3/src/server/{types,fs_extract,defines,serializer}.ts`, `runtime.ts`; Fresh docs 1.x `concepts/{routes,middleware,layouts,app-wrapper,error-pages,islands}`.

## 1. Handler and page

```tsx
import { Handlers, PageProps } from "$fresh/server.ts";

interface Data { post: { slug: string; title: string; publishedAt: string } }

export const handler: Handlers<Data> = {
  async GET(_req, ctx) {
    const post = await loadPost(ctx.params.slug);   // server side; any import is fine here
    if (!post) return ctx.renderNotFound();
    return ctx.render({ post: { ...post, publishedAt: post.publishedAt.toISOString() } });
  },
};

export default function Page({ data }: PageProps<Data>) {
  return <article><h1>{data.post.title}</h1></article>;
}
```

- `Handler<T, State> = (req: Request, ctx: FreshContext<State, T>) => Response | Promise<Response>`; `Handlers<T, State> = { [K in KnownMethod]?: Handler<T, State> }` (keys outside the known methods → R004). The named export is `handler`; `handlers` throws at startup with `Found named export "handlers" ... Did you mean "handler"?` (R013).
- `ctx.render(data?, options?)` renders the page with `data`; `ctx.renderNotFound(data?)` renders `_404.tsx`.
- When a component exists and no `GET` is defined, Fresh synthesises `GET → ctx.render()` and a `HEAD` from `GET`.
- `PageProps<T, S> = Omit<FreshContext<S, T>, "render" | "next" | "renderNotFound">`: the page also sees `url`, `params`, `state`, `route`, `isPartial`, `error`, `Component`.
- Async route without a handler: `export default async function Page(req: Request, ctx: RouteContext)` may return JSX or a `Response`; `defineRoute(fn)` wraps it.

## 2. `ctx.state` from middleware

```ts
// routes/_middleware.ts
import { MiddlewareHandler } from "$fresh/server.ts";
interface State { user: { id: string } | null }
export const handler: MiddlewareHandler<State> = async (req, ctx) => {
  ctx.state.user = await userFromCookie(req);
  return await ctx.next();
};
```

Use the same `State` in `Handlers<Data, State>` and `PageProps<Data, State>`. State set by a middleware is visible only to routes under its directory (root → leaf order; `fresh_trace` shows the chain). `ctx.destination` (`internal | static | route | notFound`) lets a middleware skip asset requests.

## 3. Forms

```ts
export const handler: Handlers = {
  async POST(req, _ctx) {
    const form = await req.formData();
    const title = String(form.get("title") ?? "");
    if (!title) return new Response("title required", { status: 400 });
    await save(title);
    return new Response(null, { status: 303, headers: { Location: "/posts" } });
  },
};
```

The `Request` is the first argument; validate at this boundary; answer with a redirect `Response` so a refresh does not resubmit.

## 4. Not found and errors

- `return ctx.renderNotFound()` from a handler; `_404.tsx` renders it. `_500.tsx` renders unhandled errors. There is no `_error.tsx` in 1.x.
- `_404.tsx` and `_500.tsx` are page components; `UnknownPageProps` and `ErrorPageProps` are the deprecated aliases of their props.

## 5. Page → island props

Accepted: `null`, boolean, number, bigint, string, arrays, plain objects, `Uint8Array`, `Signal`, JSX only as `children`. Rejected: `Date`, `Map`, `Set`, `RegExp`, `URL`, functions, class instances (I002). Convert in the handler: dates to ISO strings, maps to arrays or objects. Full table in `../../fresh-islands/references/serialization.md`.

## 6. Layouts and the app wrapper

- `routes/_layout.tsx`: `export default function Layout({ Component, state }: PageProps)`, or an async `(req, ctx: FreshContext)` / `defineLayout`; `config: LayoutConfig { skipInheritedLayouts, skipAppWrapper }`. A layout may export a `handler` in 1.x.
- `routes/_app.tsx`: `defineApp` or `({ Component }: PageProps)`; renders `<html>`; needs a default export (R016).
- Layouts accumulate outer → inner by directory; `RouteConfig.skipInheritedLayouts`/`skipAppWrapper` on a route do the same at render time. R011 flags a `skipInheritedLayouts` with nothing to skip.

## 7. Partials (1.x)

`import { Partial } from "$fresh/runtime.ts"`; `<Partial name="content" mode="replace">`; `f-client-nav` on an ancestor enables client navigation; `f-partial="/partials/x"` on `<a>`, `<button>`, `<form>`; the request carries `?fresh-partial=true` and `ctx.isPartial` is `true`. Partial routes usually set `config = { skipAppWrapper: true, skipInheritedLayouts: true }`.

## 8. Plugins

`fresh.config.ts` `defineConfig({ plugins: [...] })`: a `Plugin` may inject `routes`, `middlewares` (merged as synthetic `./routes/<path>/_middleware.ts`) and `islands`. `fresh_trace` shows plugin middlewares in the chain when they are declared literally; otherwise `confidence: inferred`.

## Validator IDs

R004, R008, R011, R013, R016, I002, B001, C006 — see `../../_shared/references/rules.md`.
