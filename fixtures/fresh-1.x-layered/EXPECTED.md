# EXPECTED — `fixtures/fresh-1.x-layered` (Fresh 1.7.3)

Facts the test-suite asserts for this fixture. Paths are POSIX, relative to the
fixture root. URL patterns use the `pathToPattern` form (`index` dropped,
`(group)` dropped, `[x]` → `:x`, `[...x]` → `:x*`, `[[x]]` → `{/:x}?`).

In 1.x the source of truth is `fresh.gen.ts`, cross-checked against the disk.
This fixture's manifest is deliberately out of sync in both directions.

## 1. Detection (`fresh_project`)

| Fact                             | Expected                                                                                                                                                                                                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isFresh`                        | `true`                                                                                                                                                                                                                                                                       |
| `version`                        | `"1"`                                                                                                                                                                                                                                                                        |
| `flavor`                         | `"1.x-manifest"`                                                                                                                                                                                                                                                             |
| `freshVersion`                   | `"1.7.3"` (from `imports["$fresh/"]`)                                                                                                                                                                                                                                        |
| `preactSpecifier`                | `https://esm.sh/preact@10.22.0`                                                                                                                                                                                                                                              |
| `entry`                          | `main: main.ts`, `dev: dev.ts`, `config: fresh.config.ts`, `manifest: fresh.gen.ts`, `client: null`, `utils: null`                                                                                                                                                           |
| `dirs`                           | `routes/`, `islands/`, `components/`, `static/`, `lib/`                                                                                                                                                                                                                      |
| `staticDirs`                     | `["static"]`                                                                                                                                                                                                                                                                 |
| `confidence`                     | `"high"`                                                                                                                                                                                                                                                                     |
| decisive evidence                | `imports["$fresh/"] = https://deno.land/x/fresh@1.7.3/`; `fresh.gen.ts` with `satisfies Manifest`; `fresh.config.ts` `defineConfig` from `$fresh/server.ts`; `main.ts` `start(manifest, config)`; `dev.ts` `dev(import.meta.url, ...)`                                       |
| plugins (from `fresh.config.ts`) | `tailwind()` from `$fresh/plugins/tailwind.ts`                                                                                                                                                                                                                               |
| `deno.json` extras               | `jsx: "react-jsx"`, `nodeModulesDir: "auto"`, tailwind npm imports, `lint.rules.tags` includes `"fresh"`                                                                                                                                                                     |
| counts (disk)                    | route files on disk: 9 (incl. invalid `handlers-export.ts` and `about.tsx`, which is missing from the manifest) + 1 manifest-only entry (`ghost.tsx`); layouts: 3; middlewares: 2; app: 1; error pages: 2 (`_404`, `_500`); islands: 7 exports across 6 files; components: 4 |

## 2. Manifest (`fresh.gen.ts`) — identifiers and discrepancies

Identifier rule (`specifierToIdentifier`): strip `./routes/` or `./islands/` and
the extension, then `stringToIdentifier` (a non-identifier char becomes `_`,
consecutive `_` collapse, a leading non-start char gets a `_` prefix), prefix
`$`, dedupe with `_1`, `_2`.

| Manifest key                                     | Identifier                       | On disk?               |
| ------------------------------------------------ | -------------------------------- | ---------------------- |
| `./routes/(marketing)/_layout.tsx`               | `$_marketing_layout`             | yes                    |
| `./routes/(marketing)/pricing.tsx`               | `$_marketing_pricing`            | yes                    |
| `./routes/_404.tsx`                              | `$_404`                          | yes                    |
| `./routes/_500.tsx`                              | `$_500`                          | yes                    |
| `./routes/_app.tsx`                              | `$_app`                          | yes                    |
| `./routes/_layout.tsx`                           | `$_layout`                       | yes                    |
| `./routes/_middleware.ts`                        | `$_middleware`                   | yes                    |
| `./routes/admin/_layout.tsx`                     | `$admin_layout`                  | yes                    |
| `./routes/admin/_middleware.ts`                  | `$admin_middleware`              | yes                    |
| `./routes/admin/index.tsx`                       | `$admin_index`                   | yes                    |
| `./routes/api/joke.ts`                           | `$api_joke`                      | yes                    |
| `./routes/blog/[slug].tsx`                       | `$blog_slug_`                    | yes                    |
| `./routes/broken/handlers-export.ts`             | `$broken_handlers_export`        | yes                    |
| `./routes/docs/[[version]]/index.tsx`            | `$docs_version_index`            | yes                    |
| `./routes/ghost.tsx`                             | `$ghost`                         | **NO** → R008 (+ D001) |
| `./routes/index.tsx`                             | `$index`                         | yes                    |
| `./routes/old/[...path].ts`                      | `$old_path_`                     | yes                    |
| `./islands/Comments.tsx`                         | `$Comments`                      | yes                    |
| `./islands/DateProp.tsx`                         | `$DateProp`                      | yes                    |
| `./islands/Leaky.tsx`                            | `$Leaky`                         | yes                    |
| `./islands/LikeButton.tsx`                       | `$LikeButton`                    | yes                    |
| `./islands/widgets/Clock.tsx`                    | `$widgets_Clock`                 | yes                    |
| `./routes/(marketing)/(_islands)/PlanToggle.tsx` | `$_marketing_islands_PlanToggle` | yes                    |

| Discrepancy          | Direction                                                                                   | Rule                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `routes/about.tsx`   | on disk, **missing from manifest** → Fresh never serves `/about` until `deno task manifest` | R008                                                                  |
| `./routes/ghost.tsx` | in manifest, **missing on disk** → `main.ts` fails to import                                | R008, D001 (relative import to a non-existent file in `fresh.gen.ts`) |
| islands              | in sync (6 entries = 6 files)                                                               | —                                                                     |

Entries are sorted exactly as `collect()` sorts them (`Array.prototype.sort`,
code-unit order: `(` < `_` < letters).

## 3. Routes (disk, cross-checked with the manifest)

Kind: `page`, `api`, `page+handler`. In 1.x a page without `GET` gets a
synthesized `GET → ctx.render()` and `HEAD`.

| File                                | In manifest         | Pattern                                                 | Kind                    | Methods                | Config                                                    | Group         | Layouts                          | Middlewares                                                   | Islands hydrated                                                        |
| ----------------------------------- | ------------------- | ------------------------------------------------------- | ----------------------- | ---------------------- | --------------------------------------------------------- | ------------- | -------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `routes/index.tsx`                  | yes                 | `/`                                                     | page                    | GET (auto)             | —                                                         | —             | `_layout`                        | `_middleware`                                                 | `islands/LikeButton.tsx::default`, `islands/widgets/Clock.tsx::default` |
| `routes/about.tsx`                  | **no** (R008)       | `/about`                                                | page                    | GET (auto)             | —                                                         | —             | `_layout`                        | `_middleware`                                                 | — (`ClickyCard` is a component)                                         |
| `routes/blog/[slug].tsx`            | yes                 | `/blog/:slug`                                           | page+handler            | GET                    | —                                                         | —             | `_layout`                        | `_middleware`                                                 | `islands/Comments.tsx::default`                                         |
| `routes/api/joke.ts`                | yes                 | `/api/joke`                                             | api                     | ALL (function handler) | —                                                         | —             | n/a                              | `_middleware`                                                 | —                                                                       |
| `routes/admin/index.tsx`            | yes                 | `/admin`                                                | page                    | GET (auto)             | —                                                         | —             | `admin/_layout` **only**         | `_middleware`, `admin/_middleware`[0], `admin/_middleware`[1] | —                                                                       |
| `routes/docs/[[version]]/index.tsx` | yes                 | `/docs{/:version}?`                                     | page                    | GET (auto)             | —                                                         | —             | `_layout`                        | `_middleware`                                                 | —                                                                       |
| `routes/old/[...path].ts`           | yes                 | `/legacy/:path*` (override; file-derived `/old/:path*`) | api                     | GET                    | `routeOverride: "/legacy/:path*"` (literal → **no R009**) | —             | n/a                              | `_middleware`                                                 | —                                                                       |
| `routes/(marketing)/pricing.tsx`    | yes                 | `/pricing`                                              | page                    | GET (auto)             | —                                                         | `(marketing)` | `_layout`, `(marketing)/_layout` | `_middleware`                                                 | `routes/(marketing)/(_islands)/PlanToggle.tsx::PlanToggle`              |
| `routes/broken/handlers-export.ts`  | yes                 | `/broken/handlers-export`                               | api (**invalid**, R013) | —                      | —                                                         | —             | n/a                              | `_middleware`                                                 | —                                                                       |
| `routes/ghost.tsx`                  | yes (manifest only) | —                                                       | **missing file** (R008) | —                      | —                                                         | —             | —                                | —                                                             | —                                                                       |

`passes_data`: `routes/blog/[slug].tsx` `handler.GET` → `ctx.render({...})` →
page, `Data = { slug: string; title: string }` (from `Handlers<Data>` /
`PageProps<Data>`).

Not routes: `routes/(marketing)/(_islands)/PlanToggle.tsx` (island).

## 4. Special files

| File                             | Kind       | Scope (dir)    | URL scope | Exports / config                                                   | Notes                                                                                       |
| -------------------------------- | ---------- | -------------- | --------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `routes/_app.tsx`                | app        | `/`            | `/`       | `default`                                                          | `<html lang="en">`, viewport, title, `<link href="/styles.css">` → **no C002**, **no R016** |
| `routes/_layout.tsx`             | layout     | `/`            | `/`       | `default`                                                          | renders `components/Nav.tsx`                                                                |
| `routes/_middleware.ts`          | middleware | `/`            | `/`       | `export async function handler(req, ctx)`, `handlers: 1`           | sets `ctx.state.user`                                                                       |
| `routes/_404.tsx`                | error      | `/`            | `/`       | `default`                                                          | `codes: [404]`; uses `Head` from `$fresh/runtime.ts`                                        |
| `routes/_500.tsx`                | error      | `/`            | `/`       | `default`                                                          | `codes: [500]`                                                                              |
| `routes/admin/_layout.tsx`       | layout     | `/admin`       | `/admin`  | `default`; `config: LayoutConfig = { skipInheritedLayouts: true }` | root layout does not apply below `/admin`                                                   |
| `routes/admin/_middleware.ts`    | middleware | `/admin`       | `/admin`  | `handler` = array, `handlers: 2`                                   | order: `requireUser`, `auditLog`                                                            |
| `routes/(marketing)/_layout.tsx` | layout     | `/(marketing)` | `/`       | `default`                                                          | group layout                                                                                |

No `_error.tsx` (1.x does not know it). Middleware order: least specific first
(`routes/_middleware.ts` → `routes/admin/_middleware.ts` → handler).

## 5. Islands (`fresh_islands`)

Every exported function is an island. 1.x name =
`sanitizeIslandName(path relative to islands/, no ext)` =
`toPascalCase(stringToIdentifier(path))`; runtime id =
`${name.toLowerCase()}_${exportName.toLowerCase()}`. Analyzer key =
`file::export`.

| File                                           | Export                       | 1.x name                                                                                                     | Runtime id                                       | Props                                         | Serializable (1.x table)                              | Used by                                         |
| ---------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | --------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| `islands/LikeButton.tsx`                       | `default`                    | `LikeButton`                                                                                                 | `likebutton_default`                             | `postId: string`, `initial: number`           | yes / yes                                             | `routes/index.tsx`                              |
| `islands/Comments.tsx`                         | `Comments`                   | `Comments`                                                                                                   | `comments_comments`                              | `items: Comment[]` (plain objects of strings) | yes                                                   | `islands/Comments.tsx::default` (nested island) |
| `islands/Comments.tsx`                         | `default` (fn `CommentsBox`) | `Comments`                                                                                                   | `comments_default`                               | `postId: string`                              | yes                                                   | `routes/blog/[slug].tsx`                        |
| `islands/DateProp.tsx`                         | `default`                    | `DateProp`                                                                                                   | `dateprop_default`                               | `publishedAt: Date`, `title: string`          | **no** (Date is not serializable in 1.x → I002) / yes | —                                               |
| `islands/Leaky.tsx`                            | `default`                    | `Leaky`                                                                                                      | `leaky_default`                                  | —                                             | —                                                     | —                                               |
| `islands/widgets/Clock.tsx`                    | `default`                    | `Widgets_Clock` (subdirectory becomes part of the name)                                                      | `widgets_clock_default`                          | `tz: string`                                  | yes                                                   | `routes/index.tsx`                              |
| `routes/(marketing)/(_islands)/PlanToggle.tsx` | `PlanToggle`                 | `Routes_marketing_islands_PlanToggle` (path is relative to the project root, `islands/` prefix not stripped) | `routes_marketing_islands_plantoggle_plantoggle` | `yearly: boolean`                             | yes                                                   | `routes/(marketing)/pricing.tsx`                |

Flags: `usesSignals` = LikeButton, Comments(default), Clock, PlanToggle;
`usesHooks` = Clock (`useEffect` from `preact/hooks`);
`usesBrowserGlobalsUnguarded` = none.

Client closure of `islands/Comments.tsx`: `components/Avatar.tsx`,
`lib/format.ts`, `@preact/signals`. Client closure of `islands/Leaky.tsx`:
`lib/db.ts` (**violation**).

## 6. Components and usages

| File                        | Exports      | Used by                  | Boundary      |
| --------------------------- | ------------ | ------------------------ | ------------- |
| `components/Nav.tsx`        | `Nav`        | `routes/_layout.tsx`     | server        |
| `components/PostBody.tsx`   | `PostBody`   | `routes/blog/[slug].tsx` | server        |
| `components/Avatar.tsx`     | `Avatar`     | `islands/Comments.tsx`   | client        |
| `components/ClickyCard.tsx` | `ClickyCard` | `routes/about.tsx`       | server → I004 |

## 7. Boundaries (`fresh_boundaries`)

| Module                                                  | Classification                        | Signals                                                    | Reachable from                      |
| ------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------- | ----------------------------------- |
| `lib/db.ts`                                             | **server-only**                       | `Deno.env.get("DATABASE_URL")`                             | `islands/Leaky.tsx` → **VIOLATION** |
| `lib/format.ts`                                         | shared (client-reachable, no signals) | —                                                          | `islands/Comments.tsx`              |
| `main.ts`, `dev.ts`, `fresh.config.ts`, `fresh.gen.ts`  | server                                | `$fresh/server.ts`, `$fresh/dev.ts`, `$std/dotenv/load.ts` | —                                   |
| `components/Avatar.tsx`                                 | client                                | —                                                          | `islands/Comments.tsx`              |
| `routes/**`, `components/{Nav,PostBody,ClickyCard}.tsx` | server                                | —                                                          | —                                   |

Violations: exactly **one** B001 chain: `islands/Leaky.tsx → lib/db.ts`
(`Deno.env`). No B002 (no route touches `window`/`document`).

## 8. Validator findings (`fresh_validate`) — must be reported

| Rule        | Severity | File(s)                            | Detail                                                                                                                                                                                                                                                                                                                                                                            |
| ----------- | -------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R008        | error    | `fresh.gen.ts`                     | `routes/about.tsx` on disk but not in `manifest.routes`; `./routes/ghost.tsx` in `manifest.routes` but not on disk. Hint: `deno task manifest`                                                                                                                                                                                                                                    |
| D001        | error    | `fresh.gen.ts`                     | `import * as $ghost from "./routes/ghost.tsx"` → file does not exist                                                                                                                                                                                                                                                                                                              |
| R013        | error    | `routes/broken/handlers-export.ts` | `export const handlers` — Fresh 1.x only accepts `handler` and throws at startup                                                                                                                                                                                                                                                                                                  |
| I002        | error    | `islands/DateProp.tsx`             | prop `publishedAt: Date` not serializable in 1.x (pass an ISO string). `title: string` is fine                                                                                                                                                                                                                                                                                    |
| I003 / B001 | error    | `islands/Leaky.tsx` → `lib/db.ts`  | chain `islands/Leaky.tsx → lib/db.ts`; signal `Deno.env.get`                                                                                                                                                                                                                                                                                                                      |
| I004        | error    | `components/ClickyCard.tsx`        | `onClick` + `useSignal` in `components/` (rendered from `routes/about.tsx`)                                                                                                                                                                                                                                                                                                       |
| C003        | error    | `static/styles.css`                | tailwind plugin is configured (`fresh.config.ts` has `tailwind()`, `tailwind.config.ts` exists with the `{routes,islands,components}` glob, npm deps present) but `static/styles.css` contains compiled CSS and **none** of the three tailwind directives (`@tailwind base` / `components` / `utilities`). Only the CSS-file check fires; the config, plugin and deps checks pass |

`summary.errors ≥ 7`, `ok: false`, `unverified: []`.

## 8b. External tools (`fresh_validate` with `external.deno_lint` / `external.deno_check`)

Verified with Deno 2.9.7 on a copy of this fixture.

| Tool                                                                                                                                 | Result                                                                                                                                                                                                                                                                                                 | Mapping                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `deno lint`                                                                                                                          | 1 problem: `fresh-handler-export` on `routes/broken/handlers-export.ts`                                                                                                                                                                                                                                | correct in 1.x → corroborates R013 (`source: "deno lint"`)                 |
| `deno check` on every file under `routes/`, `islands/`, `components/`, `lib/` plus `fresh.config.ts`, `dev.ts`, `tailwind.config.ts` | 0 errors                                                                                                                                                                                                                                                                                               | —                                                                          |
| `deno check main.ts`                                                                                                                 | 3 errors, all raised through `fresh.gen.ts`: TS2307 `Cannot find module './routes/ghost.tsx'` (R008 / D001); TS2322 + TS2345 `"./routes/broken/handlers-export.ts"` is not assignable to `RouteModule \| MiddlewareModule` because the module exports neither `handler`, `default` nor `config` (R013) | `external.deno_check` must attach these to the same files the rules report |

## 9. Must NOT be reported (negative cases)

| Rule                             | Why not                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| R012                             | 1.x handlers are `(req, ctx)` by design; `api/joke.ts`, `_middleware.ts`, `admin/_middleware.ts` are all correct          |
| R014                             | 1.x rule does not exist; `admin/_middleware.ts` is a valid array                                                          |
| R002 / R006 / R007 / R018 / R019 | no such files in this fixture                                                                                             |
| R009                             | `routes/old/[...path].ts` `routeOverride` is a string literal                                                             |
| R011                             | `admin/_layout.tsx` has a parent layout (root)                                                                            |
| R005                             | both `_middleware.ts` files export `handler`                                                                              |
| R016 / C002                      | `_app.tsx` is complete                                                                                                    |
| I002                             | on `LikeButton`, `Comments` (both exports), `Clock`, `PlanToggle` props (strings, numbers, booleans, plain object arrays) |
| I001                             | every island file exports at least one function                                                                           |
| I007                             | the only `(_islands)` folder is under `routes/`                                                                           |
| I008                             | `islands/widgets/Clock.tsx` uses browser APIs (`setInterval`) only inside `useEffect`                                     |
| B003                             | nobody imports `IS_BROWSER`                                                                                               |
| D003                             | no `fresh` / `@fresh/core` import mixed with `$fresh/`                                                                    |
| D004                             | `jsx: "react-jsx"`, `jsxImportSource: "preact"`                                                                           |
| D005                             | a single `preact` and a single `@preact/signals` specifier                                                                |
| C003 sub-checks                  | must not complain about `tailwind.config.ts` `content`, about the plugin in `fresh.config.ts`, or about missing npm deps  |
| C007                             | `lint.rules.tags` includes `"fresh"`                                                                                      |
| `_error.tsx`                     | must not be expected/required in 1.x                                                                                      |

## 10. `fresh_trace` table

`mw:root` = `routes/_middleware.ts`, `mw:admin1/2` = entries of
`routes/admin/_middleware.ts`. In 1.x `static/` is served **before** routes,
always.

| Request                       | Matched                                           | Params                     | Chain                                                                                                                                | Islands                               |
| ----------------------------- | ------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `GET /`                       | `routes/index.tsx`                                | —                          | `_app` → `_layout` → `[mw:root]` → auto `GET` → page                                                                                 | `LikeButton`, `Widgets_Clock`         |
| `GET /about`                  | `routes/about.tsx` (on disk)                      | —                          | analyzer: `_app` → `_layout` → `[mw:root]` → page, flagged R008; **runtime: 404 (`_404.tsx`)** because the manifest does not list it | —                                     |
| `GET /blog/hello`             | `routes/blog/[slug].tsx`                          | `slug=hello`               | `_app` → `_layout` → `[mw:root]` → `handler.GET` → `ctx.render` → page                                                               | `Comments` (default)                  |
| `POST /blog/hello`            | `routes/blog/[slug].tsx`                          | `slug=hello`               | no `POST` in `handler` → **405**                                                                                                     | —                                     |
| `GET /api/joke` (any method)  | `routes/api/joke.ts`                              | —                          | `[mw:root]` → function handler                                                                                                       | —                                     |
| `GET /admin`                  | `routes/admin/index.tsx`                          | —                          | `_app` → `admin/_layout` (root layout skipped) → `[mw:root, mw:admin1, mw:admin2]` → page                                            | —                                     |
| `GET /docs` / `GET /docs/v1`  | `routes/docs/[[version]]/index.tsx`               | `version=undefined` / `v1` | `_app` → `_layout` → `[mw:root]` → page                                                                                              | —                                     |
| `GET /legacy/a/b`             | `routes/old/[...path].ts`                         | `path=a/b`                 | `[mw:root]` → `handler.GET` (301)                                                                                                    | —                                     |
| `GET /old/a/b`                | **no route** (override replaced the file pattern) | —                          | → `_404.tsx`                                                                                                                         | —                                     |
| `GET /pricing`                | `routes/(marketing)/pricing.tsx`                  | —                          | `_app` → `_layout` → `(marketing)/_layout` → `[mw:root]` → page                                                                      | `Routes_marketing_islands_PlanToggle` |
| `GET /styles.css`             | `static/styles.css`                               | —                          | static wins over routes                                                                                                              | —                                     |
| `GET /broken/handlers-export` | `routes/broken/handlers-export.ts`                | —                          | invalid export → app fails at startup (R013); analyzer lists the route and flags it                                                  | —                                     |
| `GET /ghost`                  | manifest entry with no file                       | —                          | R008; runtime import error                                                                                                           | —                                     |
| `GET /nope`                   | no route                                          | —                          | `_404.tsx`                                                                                                                           | —                                     |
