---
name: fresh-components
description: >-
  How to add or change a server-rendered component in a Deno Fresh project (1.x and 2.x):
  reuse before creating, where a component shared by islands and routes may live, the
  shared boundary, composition instead of a monolithic route, and why a component in
  components/ has no state or event handlers. Use when editing components/**, when a task
  asks for a new UI piece, section, card, header or layout fragment, or when a route file
  has grown into one large JSX block. Query fresh_components and fresh_usages before
  creating anything.
user-invocable: false
paths: "components/**"
---

# fresh-components

`components/` is not special to Fresh: the crawler never reads it. A component is a plain
Preact function imported by routes, layouts, islands or other components. Fresh decides
*where it runs* from who imports it, not from the folder.

References: `references/composition.md`, `../_shared/references/versions.md`.

## Before touching anything

| Question | Call |
|---|---|
| Does a component with this job already exist? | `fresh_components(workspace="/abs/path", name="Card")`; livespec `search_similar` on the body you are about to write, when mounted |
| Who uses it, with which props? | `fresh_usages(workspace="/abs/path", target="components/Card.tsx::Card")` — `imports` and `jsxUses` (file, line, prop names) |
| Is it server-only, client, or shared? | `fresh_components(workspace="/abs/path", only="shared")` — `boundary`, `reachableFromIslands` |
| What does it import, and would that survive the browser? | `fresh_dependencies(workspace="/abs/path", file="components/Card.tsx")` |
| Which routes change if I edit it? | `fresh_impact(workspace="/abs/path", files=["components/Card.tsx"])` |

## Decision rules

### Server by default

A component renders on the server unless an island imports it. So in `components/`: no
`onClick`, no `useState`, no `useSignal`, no `useEffect`. They are dropped with the JS and
nothing tells you (I004; `deno lint` `fresh-server-event-handlers`: "Components inside
the `routes/` folder in a fresh app are exclusively rendered on the server"). Need
interactivity? See `fresh-islands`; the component can stay as the island's
presentational child.

### Shared means clean on both sides

When an island imports a component, that component and everything it imports ship to the
browser. `fresh_components` reports `client` (reachable only from islands) or `shared`
(reachable from islands and routes). A shared component must have:

- no server signal (`Deno.*`, `node:*`, DB drivers, `$std/dotenv`, `@std/fs`) — B001;
- no unguarded browser global (`window`, `document`, `localStorage`) — B002;
- props an island can hand it: the island's own props are what get serialized, so a
  component that needs a callback cannot sit under an island that received data only.

Location does not enforce this; the import graph does. `(_components)/` under `routes/`
is only an ignored folder (Fresh docs: file-routing).

### Composition over monolith

A route with one long JSX block and no components is C001. Split by section, pass what
varies as props, keep static single-use content inline. Name the props interface after
the component; type `children` as `ComponentChildren` from `preact`. Use `class`, not
`className` (both work in Preact; the Fresh convention is `class`, C005).

### Naming for the symbol graph

livespec maps `.fresh-dev/graph.json` nodes to symbols by name. `export default function
Card()` maps; an anonymous arrow does not. In 2.x, name the function inside
`define.page(function Home() { ... })`, and prefer named function exports in components.

### Version notes

- `preact` and `@preact/signals` resolve through `deno.json` in both versions; 2.x adds
  the `@/` alias (`@/components/Card.tsx`), 1.x uses relative paths. Use what the repo
  uses (D002 when a bare specifier is not in the import map).
- `<Head>` from `fresh/runtime` (2.x) or `$fresh/runtime.ts` (1.x) works inside a
  component rendered by a route; in 2.x it is documented to work in islands as well.
- `asset("/x.png")` from the same runtime module appends the build id for caching.

## Minimal change

1. Extend the existing component (a prop, a variant) before creating a sibling with a
   different name; `fresh_usages` lists every call site you must keep working.
2. New file: PascalCase name matching the export, one component per file, explicit props
   interface, `class` attributes, relative or `@/` imports as the repo does.
3. If an island will render it, re-check `fresh_boundaries` after adding the import: the
   closure must stay free of server signals.
4. Validate: `fresh_validate(workspace="/abs/path", categories=["conventions",
   "boundaries"], files=["components/Card.tsx"])`, then `deno check`, then `deno lint`
   (tag `fresh`).

## Traps

| Trap | ID |
|---|---|
| Event handler or hook in a component no island renders | I004 |
| Component reachable from an island importing a server-only module | B001 |
| Server-rendered component touching `window`/`document` without a guard | B002 |
| `*.server.ts`/`db*` module with no server signal (the name lies) | B004 |
| Monolithic route, no components | C001 |
| `className` instead of `class` | C005 |
| Island imported through a `components/index.ts` barrel | I005 |
| Relative import to a file that does not exist (case-sensitive) | D001 |
| Bare specifier missing from `deno.json` `imports` | D002 |

## Precedence

The project's existing conventions outrank this skill; the user's request and safety
outrank both (`engineering-baseline`). A repo that uses `className`, nested component
folders or a barrel keeps doing so; report the finding IDs, do not migrate the repo.
