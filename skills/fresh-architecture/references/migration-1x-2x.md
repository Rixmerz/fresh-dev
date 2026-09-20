# Migrating 1.x → 2.x — what fresh-dev can tell you (diagnosis only)

fresh-dev does not rewrite code. The official codemod is
`deno run -A -r jsr:@fresh/update .` (it uses ts-morph). Use fresh-dev before
and after it to see what changed and what still looks like 1.x.

## Signals of a half-migrated project

| Symptom | Rule / tool |
|---|---|
| `deno.json` maps both `$fresh/` and `fresh` | D003 |
| Modules import from `$fresh/…` next to modules importing `fresh` | D003 (inferred) |
| `handler` functions with `(req, ctx)` | R012 (2.x rejects two-parameter handlers) |
| `fresh.gen.ts` still present in a 2.x project | `fresh_project.entry.manifest` non-null; delete it |
| `ctx.render(data)` (1.x data pass) in a 2.x page | `fresh_route.passesData.renderCalls` |
| `IS_BROWSER` from `$fresh/runtime.ts` | B003 |
| `_404.tsx`/`_500.tsx` only | still accepted in 2.x; `_error.tsx` is the unified form |
| Tailwind 3 plugin wiring | C003 (1.x) vs C004 (2.x: `@tailwindcss/vite`) |

## API mapping

| 1.x | 2.x |
|---|---|
| `Handlers<Data, State>` with `(req, ctx)` | `define.handlers({ GET(ctx) {…} })` — `ctx.req`, `ctx.state`, `ctx.params` |
| `ctx.render(data)` | `return page(data)` (or `{ data }`); the page receives `{ data }` |
| `PageProps<Data, State>` | `define.page<typeof handler>(({ data, state }) => …)` |
| `ctx.renderNotFound()` | `throw new HttpError(404)` |
| `MiddlewareHandler` `(req, ctx)` | `define.middleware((ctx) => … ctx.next())` |
| `defineRoute/defineLayout/defineApp` | `define.page` / `define.layout` / `define.page` in `_app.tsx` |
| `$fresh/runtime.ts` (`Head`, `asset`, `IS_BROWSER`, `Partial`) | `fresh/runtime` |
| `fresh.config.ts` plugins | `main.ts` `app.use(...)`, Vite plugins |
| `start(manifest, config)` | `export const app = new App()`; `deno serve _fresh/server.js` |
| `Date`, `Map`, `Set` island props not allowed | allowed (2.x serializer) |
