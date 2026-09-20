# Validator catalogue — `fresh_validate` and `fresh-mcp validate`

Copied from the plan (§5). Severity: `error` breaks at runtime or build; `warning` works
but is fragile; `info` is style or architecture. `ok` means no `error`. Rules never
duplicate `deno lint`/`deno check`; I004 and C007 exist because lint output only arrives
when someone runs it. Anything deduced carries `confidence: "inferred"`. Files that could
not be parsed are listed in `summary.unverified[]`, never reported as clean.

CLI: `fresh-mcp validate <workspace> [--json] [--category …] [--file …] [--deno-lint]
[--deno-check]` — exit 0 if `ok`, 1 on any `error`, 2 if not a Fresh project, 3 on an
internal error.

## routes

| ID | Sev | Rule | Versions |
|---|---|---|---|
| R001 | error | Route file with an invalid name (spaces, capitalised dynamic segment, empty `[]`, `[...x]` not last) | 1, 2 |
| R002 | error | Route without `handler` and without `default` export (does nothing) | 1, 2 |
| R003 | error | `.ts` (API) route containing JSX, or a `default` that returns JSX | 1, 2 |
| R004 | error | `handler(s)` object with keys outside `HEAD\|GET\|POST\|PATCH\|PUT\|DELETE\|OPTIONS` | 1, 2 |
| R005 | error | `_middleware.ts` without `handler` export (1.x) / without `define.middleware`/`handler` (2.x) | 1, 2 |
| R006 | error | Two files produce the same pattern (`foo.tsx` and `foo/index.tsx`; two equal `routeOverride`s) | 1, 2 |
| R007 | warning | Two sibling dynamic segments with different names (`[id].tsx`, `[slug].tsx`) — order undefined | 1, 2 |
| R008 | error | `fresh.gen.ts` out of sync with disk (route/island on disk missing from the manifest or vice versa) → `deno task manifest` | 1 |
| R009 | warning | `config.routeOverride` not a literal (not analysable) → `confidence: inferred` | 1, 2 |
| R010 | warning | 2.x: uses `define.*` without importing `define` from the project's `utils.ts` (or a different `define` per file → inconsistent `State`) | 2 |
| R011 | info | `_layout.tsx` with `skipInheritedLayouts` and no parent layouts (no-op) | 1, 2 |
| R012 | error | 2.x: `handler(s)` function with two parameters `(req, ctx)` (1.x style) → startup error `Handlers must only have one argument` | 2 |
| R013 | error | 1.x: `handlers` export (Fresh 1 only accepts `handler` and throws at startup) | 1 |
| R014 | error | 2.x: `_middleware.ts` with a by-method object (`{GET(){…}}`) → rejected | 2 |
| R015 | warning | 2.x: `_layout.tsx` with a `handler` export (Fresh warns and ignores it) | 2 |
| R016 | error | `_app.tsx` without `default` | 1, 2 |
| R017 | error | 2.x Vite: `main.ts` calls `app.listen()` (collides with `deno task dev/start` → `AddrInUse`) | 2 |
| R018 | error | File under `routes/` or `islands/` with an extension the crawler does not read (`.mts`, `.mjs`, `.cts`) → never a route/island | 1, 2 |
| R019 | info | File under `routes/` matching the test pattern (`*_test.ts`, `*.test.tsx`) → ignored by design | 1, 2 |
| R020 | error | 2.x: `main.ts` without `app.use(staticFiles())` → island JS and `static/` are not served | 2 |

## islands

| ID | Sev | Rule | Versions |
|---|---|---|---|
| I001 | error | Island file with no exported function (every exported function is an island; `default` is not required) | 1, 2 |
| I002 | error | Non-serializable island prop. **2.x** accepts `null/undefined/boolean/number(NaN, ±Infinity, -0)/bigint/string`, arrays, plain objects, `Uint8Array`, `URL`, `Date`, `RegExp`, `Set`, `Map`, `Temporal.*`, `Signal` (via `.peek()`), computed (static value), JSX/`ComponentChildren`, circular refs; **rejects** functions (`Serializing functions is not supported`), class instances, `Symbol`, `WeakMap/WeakSet`, streams, promises. **1.x** accepts only `null/boolean/number/bigint/string`, arrays, plain objects, `Uint8Array`, `Signal`, JSX only as `children`; **rejects** also `Date`, `Map`, `Set`, `RegExp`, `URL` (pass ISO strings) | 1, 2 |
| I003 | error | Island that reaches (transitively) a server-only module (delegated to B001 with `via: island`) | 1, 2 |
| I004 | error | Component in `components/` or a route with `onClick`/`onInput`/`useState`/`useSignal`/`useEffect` → never hydrated (equivalent to `deno lint` `fresh-server-event-handlers`) | 1, 2 |
| I005 | warning | Island consumed through a barrel (`components/index.ts` re-exporting from `islands/`) → the JSX use is not attributed to the island by direct import; reported with `confidence: inferred` | 1, 2 |
| I006 | warning | Island too large (client closure > N files, or whole `components/` pulled in through a barrel) | 1, 2 |
| I007 | error | `(_islands)/` folder outside `routes/` (the crawler only recognises it under `routes/`) | 1, 2 |
| I008 | warning | Island using `window`/`document`/`navigator` outside `IS_BROWSER`/`useEffect` (islands also render on the server) | 1, 2 |

## boundaries

| ID | Sev | Rule | Versions |
|---|---|---|---|
| B001 | error | Module reachable from an island imports a server-only signal (`Deno.*`, `node:`, drivers, `$std/dotenv`, KV) | 1, 2 |
| B002 | warning | Server module (route/middleware/layout/app) uses `window`/`document`/`localStorage` outside an `IS_BROWSER` guard | 1, 2 |
| B003 | warning | `IS_BROWSER` imported from the wrong specifier (`$fresh/runtime.ts` in 2.x, `fresh/runtime` in 1.x) | 1, 2 |
| B004 | info | `shared` module with no signals but named `*.server.ts`/`db*` (broken convention) | 1, 2 |

## dependencies

| ID | Sev | Rule | Versions |
|---|---|---|---|
| D001 | error | Relative import to a non-existent file (case-sensitive) | 1, 2 |
| D002 | error | Bare specifier not in `deno.json` `imports` and not `jsr:`/`npm:`/`https:`/`node:` | 1, 2 |
| D003 | error | `$fresh/` (1.x) mixed with `fresh`/`@fresh/core` (2.x) | 1, 2 |
| D004 | error | `compilerOptions.jsxImportSource` ≠ `preact`, or `jsx` not in {`react-jsx`, `precompile`} (2.x generates `precompile` + `jsxPrecompileSkipElements`; 1.x `react-jsx`) | 1, 2 |
| D005 | warning | Two versions of `preact` or `@preact/signals` in the import map (esm.sh + npm) | 1, 2 |
| D006 | warning | Import cycle involving `routes/` or `islands/` | 1, 2 |
| D007 | info | `npm:` import in an island without `nodeModulesDir` (1.x) / dependency needing extra `--allow-*` | 1 |

## conventions

| ID | Sev | Rule | Versions |
|---|---|---|---|
| C001 | warning | Monolithic page: route with > N lines of JSX and no components | 1, 2 |
| C002 | info | `_app.tsx` without `<html lang>`/`<meta viewport>`/`<title>` | 1, 2 |
| C003 | error | Tailwind 1.x: `static/styles.css` without directives, `tailwind.config.ts` without `content` for `{routes,islands,components}`, plugin missing from `fresh.config.ts`, npm deps missing | 1 |
| C004 | error | Tailwind 2.x (verified with `@fresh/init --tailwind`): `tailwindcss` + `@tailwindcss/vite` in `imports`, `tailwindcss()` in `vite.config.ts`, and the CSS imported from `client.ts` (not from `static/`) | 2 |
| C005 | info | `className` instead of `class` (works in Preact; the Fresh convention is `class`) | 1, 2 |
| C006 | info | API route without handling of unsupported methods (returns 405) | 1, 2 |
| C007 | warning | `deno.json` `lint.rules.tags` without `"fresh"` (loses `fresh-server-event-handlers`, `fresh-handler-export`, `jsx-*`, `react-rules-of-hooks`…) | 1, 2 |
| C008 | info | 2.x: `deno lint` reports `fresh-handler-export` on `export const handlers` — the rule reflects 1.x; in 2.x `handlers` is the preferred export. `fresh_validate` marks it as a false positive when merging `deno lint` | 2 |
| C009 | info | 2.x Vite: CSS/files imported from code living inside `static/` (they belong in `assets/`, imported from `client.ts`) | 2 |
