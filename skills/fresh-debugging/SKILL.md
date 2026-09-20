---
name: fresh-debugging
description: >-
  A symptom-to-diagnosis tree for Deno Fresh projects (1.x and 2.x): a URL that returns
  404 or hits the wrong file, an island that is not interactive, hydration errors, styles
  not applied, a stale fresh.gen.ts, startup errors about handlers or exports, missing
  ctx.state or page data, and type or module-not-found errors. Use when a user reports
  "route 404", "island not interactive", "button does nothing", "hydration", "styles not
  applied", "Deno is not defined", "AddrInUse", "Could not find relevant exports" or
  "Route conflict detected". Read-only: it never edits.
user-invocable: false
---

# fresh-debugging

Start from the symptom, not from the code. Each branch names the one call that turns the
symptom into a fact and the validator ID that usually explains it. Do not edit while
diagnosing; report `path:line` facts and the rule ID, then hand off to the skill that
owns the fix (`fresh-routing`, `fresh-islands`, `fresh-data-flow`, `fresh-middleware`,
`fresh-architecture`).

Reference: `references/symptoms.md` (each symptom with the exact error text and the
version-specific causes).

## Step 0, always

`fresh_project(workspace="/abs/path")`: `version`, `flavor`, index state. Half of all
"Fresh bugs" are 1.x rules applied to 2.x or the reverse. After a `git pull` or an edit
made outside Claude Code, `fresh_reindex(workspace="/abs/path", force=true)`.

Then `fresh_validate(workspace="/abs/path")`: an `error` finding whose file is on the
path of the symptom is the diagnosis until proven otherwise. Read `summary.unverified[]`:
a file there was not analysed and may hold the bug.

## The tree

### URL returns 404, or the wrong page

`fresh_trace(workspace="/abs/path", path="/blog/hello", method="GET")`.

- `matched` empty: the file is not a route. Wrong extension (R018), test-pattern name
  (R019), inside a `(_xxx)/` folder, bad segment name (R001), 1.x manifest without it
  (R008: `deno task manifest` or restart `dev.ts`), 2.x `app.fsRoutes()` missing or
  mounted under a sub-path.
- `matched` is another route: precedence. Static beats dynamic, dynamic in registration
  order (R006 duplicate patterns, R007 sibling params). A `(group)/` expected in the URL
  never is.
- `staticMatch` set: a file in `static/` shadows the route (1.x always; 2.x when
  `staticFiles()` is registered before `fsRoutes()`).
- `notFound` names an unexpected `_404`/`_error`: 2.x `_404.tsx` is root-only and only
  answers `HttpError` 404; nested error handling is `_error.tsx`.
- Route exists but does nothing: R002 (no `handler(s)`, no `default`) or R003 (JSX in
  `.ts`).

### Island not interactive, button does nothing

`fresh_islands(workspace="/abs/path", name="LikeButton")`.

- Not listed: it is not an island. File in `components/` or `routes/` (I004; see
  `fresh-islands`), `(_islands)/` outside `routes/` (I007), no exported function (I001),
  wrong extension (R018).
- Listed, `usedBy` empty: no route renders it. Check the import path (D001) and
  `fresh_usages(workspace="/abs/path", target="islands/LikeButton.tsx::LikeButton")`.
- `violations[]` non-empty: the client bundle fails. Server-only import (I003/B001;
  `Deno is not defined`, `Node built-in modules cannot be imported in the browser`).
- `props` marked not serializable: I002. 1.x rejects `Date`/`Map`/`Set`; both reject
  functions (`Serializing functions is not supported`).
- Everything clean, still dead: 2.x `main.ts` without `app.use(staticFiles())` (R020);
  island reached through a barrel (I005, `confidence: inferred`); `IS_BROWSER` imported
  from the other version's specifier (B003).

### Hydration or SSR error

`window`, `document`, `localStorage` undefined: the island renders on the server too.
I008 (guard with `IS_BROWSER` or move into `useEffect`); in a route, layout or middleware
the same access is B002.

### Styles not applied

- 1.x Tailwind: C003 covers the four causes (`static/styles.css` without the directives,
  `tailwind.config.ts` `content` missing `{routes,islands,components}`, plugin absent from
  `fresh.config.ts`, npm deps or `nodeModulesDir` missing); also the `<link>` in
  `_app.tsx`.
- 2.x Tailwind: C004 (`tailwindcss` + `@tailwindcss/vite` in `imports`, `tailwindcss()`
  in `vite.config.ts`, CSS imported from `client.ts`); C009 when the imported CSS sits in
  `static/`.
- Some elements only: `className` where the repo uses `class` (C005).

### Startup error text → rule

| Text | Rule |
|---|---|
| `Found named export "handlers" ... Did you mean "handler"?` | R013 (1.x) |
| `Handlers must only have one argument` | R012 (2.x) |
| `Could not find relevant exports in: ...` | R002 (2.x) |
| `Middleware does not support object handlers with GET, POST...` | R014 (2.x) |
| `Route conflict detected. Multiple files have the same name` | R006 (1.x) |
| `AddrInUse` under `deno task dev`/`start` | R017 (2.x Vite `app.listen()`) |
| `Cannot find module 'fresh'` from `tsc` or `typescript-language-server` | not a project bug: use `deno lsp` and `deno check` |

### Page renders without data, `ctx.state` undefined

`fresh_trace` the URL: is the middleware that sets the field in `chain[]`? Scope is by
directory (root → leaf); 2.x globals are registered in `main.ts` before
`app.fsRoutes()`. Then `fresh_route(file=...)` `passes_data`: 1.x `ctx.render(data)`,
2.x `page(data)`/`{data}`. A page typed against a different `Data` than the handler
returns is a `deno check` error, not a Fresh one. `define` from a second `createDefine`
call is R010.

### Layout applied twice, or not at all

`fresh_route(file=...)` shows the layout chain. `skipInheritedLayouts` keeps only the
nearest; `skipAppWrapper` drops `_app`; R011 flags a no-op skip. 2.x `_layout.tsx` with
a `handler` export is ignored with a warning (R015). Partial routes skip both on
purpose.

### Type errors, module not found

`deno check` (2.x) or `deno check main.ts` (1.x); `fresh_validate(workspace="/abs/path",
external={deno_check: true, deno_lint: true})` merges them into findings. Bare specifier
missing: D002; relative path wrong or wrong case: D001; `$fresh/` next to `fresh`: D003.
If the editor shows errors that `deno check` does not, two LSPs claim `.ts`
(`typescript-lsp` plus this plugin's `deno lsp`); only `deno lsp` reads `deno.json`.
`deno lint` `fresh-handler-export` on a 2.x `export const handlers` is a false positive
(C008).

### Still unexplained

Static analysis says what could run; a trace says what did. If livespec is mounted
(`.mcp-docs/docs.db`), `resolve_location(path, line)` turns a stack frame into a symbol
and `who_calls` shows its callers. If a `.flowtrace/` footprint exists, use its trace of
the failing request. Otherwise reproduce with the project's dev task and read the server
log.

## Precedence

The project's existing conventions outrank this skill; the user's request and safety
outrank both (`engineering-baseline`). A diagnosis is a report of facts with rule IDs;
the fix belongs to the owning skill and to whoever asked.
