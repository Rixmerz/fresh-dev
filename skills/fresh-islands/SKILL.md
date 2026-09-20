---
name: fresh-islands
description: >-
  When something in a Deno Fresh project must be an island and how to build one that
  hydrates: serializable props per version, the client closure an island drags into the
  bundle, nested islands, signals versus hooks, IS_BROWSER guards, and why an onClick in
  components/ or routes/ never fires. Use when adding or changing interactivity, editing
  islands/** or a (_islands)/ folder, or when a button, form, counter or hook does nothing
  in the browser. Query fresh_islands and fresh_boundaries before editing.
user-invocable: false
paths: "islands/**,routes/**/(_islands)/**"
---

# fresh-islands

Only islands (and what they import, plus 2.x `client.ts`) reach the browser. Everything
else renders once on the server and ships as HTML. So every island question is a boundary
question: what crosses the line, and what must never.

References: `references/islands.md` (discovery, naming, closure, hooks and signals),
`references/serialization.md` (the prop tables), `../_shared/references/versions.md`.

## Before touching anything

| Question | Call |
|---|---|
| Version (prop serialization and the runtime import differ) | `fresh_project(workspace="/abs/path")` |
| Does an island for this already exist? Who renders it? | `fresh_islands(workspace="/abs/path", name="LikeButton")` — `usedBy`, `exports`, `props` |
| What will it pull into the client bundle? | same call — `clientClosure` (files, size), `violations[]`; `fresh_dependencies(workspace="/abs/path", file="islands/LikeButton.tsx", depth=3)` for the chain |
| Does anything it reaches touch `Deno.*`, `node:`, a DB driver? | `fresh_boundaries(workspace="/abs/path", only_violations=true)` |
| Which routes hydrate it, with which props? | `fresh_usages(workspace="/abs/path", target="islands/LikeButton.tsx::LikeButton")` — `jsxUses` with prop names |
| Where does it sit in the page chain? | `fresh_route(workspace="/abs/path", file="routes/blog/[slug].tsx")` — `hydrates` |

## Decision rules

### Island or not

Make it an island when the code needs an event handler, `useState`/`useEffect`,
`useSignal`, or a browser API. Otherwise it is a component or part of the route:
server-rendered, cheaper, never hydrated. A handler in `components/` or `routes/` is
silently dead (I004; `deno lint` `fresh-server-event-handlers`).

Static content inside an island works but ships JS for nothing: keep the island to the
interactive part and pass the rest as `children` or props.

### Where the crawler looks (both versions; fresh source: fs_crawl.ts, dev/mod.ts)

- `islands/**` recursively, and every `(_islands)/` directory under `routes/` (I007 when
  it is anywhere else). Extensions `tsx|jsx|ts|js`; test-pattern files skipped (R018).
- **Every exported function in an island file is an island.** A file with no exported
  function is I001. 2.x names the default export after the file; 1.x builds
  `<file>_<export>` ids. Named exports work in both.
- 2.x can register external islands (`islandSpecifiers` in `fresh({...})`,
  `builder.registerIsland(...)`). There is no glob config and no file-name marker;
  location decides.

### Props: what crosses the boundary

Props are serialized into the HTML and revived in the browser. Full tables in
`references/serialization.md`; the short form:

| | 1.x | 2.x |
|---|---|---|
| fine | `null`, boolean, number, bigint, string, arrays, plain objects, `Uint8Array`, `Signal`; JSX only as `children` | the same plus `undefined`, `Date`, `URL`, `RegExp`, `Map`, `Set`, `Temporal.*`, computed signals, JSX anywhere, circular refs |
| never | functions, class instances, `Date`, `Map`, `Set`, `RegExp`, `URL` (pass ISO strings) | functions (`Serializing functions is not supported`), class instances, `Symbol`, `WeakMap`/`WeakSet`, streams, promises |

A callback prop is the most common I002: pass data and let the island own the handler,
or create a signal in the route and pass it down.

### Signals and hooks

- Signals cross the boundary: a `Signal` created in a route arrives as a new signal in
  the browser (2.x serializes via `.peek()`; shared instances stay shared). That is how a
  route shares state with an island, or two islands with each other.
- Hooks from `preact/hooks` run only inside the island; `react-rules-of-hooks` (tag
  `fresh`) lints them.
- Nested islands work in both versions; their props are serialized too.

### The island also renders on the server

`window`, `document`, `localStorage`, `navigator` are undefined during SSR. Guard them
with `IS_BROWSER` or run them inside `useEffect` (I008). Import `IS_BROWSER` from
`fresh/runtime` (2.x; `IS_BROWSER = typeof document !== "undefined"`) or
`$fresh/runtime.ts` (1.x); the other specifier is B003. `fresh/runtime` is documented as
safe to import in islands (Fresh docs: api-reference).

### The island must not reach the server

Anything reachable from an island through a static import enters the client bundle.
`Deno.*` (including `Deno.env`, except the literal `Deno.env.get("FRESH_PUBLIC_X")` that
2.x inlines at build time), `node:*`, `@std/fs`, `@std/io`, `$std/dotenv`, DB drivers and
`Deno.openKv` fail at bundle or run time (`Deno is not defined`; the 2.x Vite plugin
reports `Node built-in modules cannot be imported in the browser` with the importer
chain). B001 and I003 report the same with the chain `island → … → module`. Move the call
into a handler and pass the result as a prop.

## Minimal change

1. `fresh_islands(name=...)` and `fresh_components(name=...)`: extend an existing island
   or promote an existing component before writing a new file.
2. One exported function per file unless the siblings are always used together (every
   export is a separate island).
3. Import only `preact`, `@preact/signals`, `fresh/runtime` (or `$fresh/runtime.ts`) and
   modules with no server signal; import components directly, never through a barrel
   (I005, I006).
4. Render it from the route with serializable props. 2.x `main.ts` must have
   `app.use(staticFiles())` or the island JS is never served (R020).
5. Validate: `fresh_validate(workspace="/abs/path", categories=["islands", "boundaries"],
   files=["islands/LikeButton.tsx"])` and read `violations[]`; then `deno check`; then
   `deno lint` (tag `fresh`: `fresh-server-event-handlers`, `react-rules-of-hooks`).

## Traps

| Trap | ID |
|---|---|
| Island file with no exported function | I001 |
| Non-serializable prop (callback, class instance, 1.x `Date`) | I002 |
| Island reaching a server-only module | I003 (B001 with `via: island`) |
| Handler or hook in `components/` or `routes/` | I004 |
| Island consumed through a barrel re-export | I005 (`confidence: inferred`) |
| Closure too large (whole `components/` through a barrel) | I006 |
| `(_islands)/` outside `routes/` | I007 |
| Unguarded `window`/`document` in an island | I008 |
| `IS_BROWSER` from the other version's specifier | B003 |
| 2.x without `staticFiles()` | R020 |
| `.mts`/`.mjs` under `islands/` | R018 |

## Precedence

The project's existing conventions outrank this skill; the user's request and safety
outrank both (`engineering-baseline`). If the repo keeps islands in an unusual place or
names them differently, follow the repo and report the friction.
