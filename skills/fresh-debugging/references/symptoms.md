# Symptoms → diagnosis (Fresh 1.x and 2.x)

Every step names the tool or rule that answers it. All `fresh_*` calls take
`workspace` (absolute project root).

## A URL returns 404 / the wrong page

1. `fresh_trace(path)` → `matched`, `candidates`, `staticMatch`, `notFound`.
2. No match: is the file under `routes/` with a crawlable extension
   (`tsx|jsx|ts|js`, R018)? Is it a test file (R019)? Is it inside a `(_xxx)`
   folder (never a route)? 1.x: is it in `fresh.gen.ts` (R008 → `deno task manifest`)?
3. Wrong file wins: two files with the same pattern (R006), sibling `[id]` and
   `[slug]` (R007), a `routeOverride` that replaced the file pattern (see
   `filePattern` vs `pattern`), a static file served first (`staticMatch`).
4. 405: method missing from the handler object (`methodAllowed: false`).

## An island is not interactive

1. `fresh_islands(name)` → does the export exist and is it a function (I001)?
2. Is the component actually in `islands/` or `routes/**/(_islands)/`? A
   component with `onClick` in `components/` or `routes/` never hydrates (I004,
   `deno lint` `fresh-server-event-handlers`).
3. Props: functions never serialize (I002); 1.x also rejects `Date`, `Map`, `Set`.
4. 2.x: `app.use(staticFiles())` missing → island JS is not served (R020).
5. Boundary: the island (transitively) imports server-only code → the bundle
   fails (B001, chain shown).
6. Browser globals at render time (`document`, `window`) crash SSR of the
   island (I008) — guard with `IS_BROWSER` or `useEffect`.
7. Two copies of preact (D005) break hooks and signals.

## Styles do not apply

- 1.x + Tailwind 3: `static/styles.css` must contain the three `@tailwind`
  directives, `tailwind.config.ts` `content` must cover
  `{routes,islands,components}`, `fresh.config.ts` must register `tailwind()` (C003).
- 2.x Vite + Tailwind 4: `@tailwindcss/vite` in `deno.json` and
  `tailwindcss()` in `vite.config.ts`; the CSS is imported from `client.ts` (C004).
- CSS imported from code but placed in `static/` (C009).

## Types / editor errors

- `Cannot find module 'fresh'` in the editor: the LSP is
  `typescript-language-server`, not `deno lsp` — it cannot read import maps.
- `deno check` fails: `fresh_validate(external: {deno_check: true})` merges the
  TS errors with file/line; `deno lint` with the `fresh` tag adds the JSX rules.
- 2.x: `deno lint` reports `fresh-handler-export` on `export const handlers` —
  it is a 1.x-era rule; `fresh_validate` marks it C008 (false positive).

## Startup errors (2.x)

| Message | Cause | Rule |
|---|---|---|
| `Could not find relevant exports in: …` | route file without default/handler(s)/config | R002 |
| `Handlers must only have one argument` | 1.x-style `(req, ctx)` | R012 |
| `Middleware does not support object handlers` | by-method object in `_middleware.ts` | R014 |
| `AddrInUse` on `deno task dev` | `app.listen()` in Vite mode | R017 |

## Startup errors (1.x)

| Message | Cause | Rule |
|---|---|---|
| `Found named export "handlers" … Did you mean "handler"?` | 1.x only accepts `handler` | R013 |
| `Route conflict detected. Multiple files have the same name` | two route files differing only by extension | R006 |
| `Cannot find module './routes/…'` from `fresh.gen.ts` | manifest references a deleted file | R008, D001 |

## When fresh-dev is not enough

- Symbol-level questions ("what calls this function") → livespec `who_calls`,
  `read_unit` (if mounted).
- What actually happened at runtime → flowtrace, or `deno task dev` logs.
- Layout/visual bugs → layout-inspector.
