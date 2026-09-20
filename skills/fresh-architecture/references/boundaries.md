# Server / client boundaries

Only islands (plus `client.ts` in 2.x Vite mode) are bundled for the browser;
everything under `routes/`, `main.ts`, middlewares and layouts runs on the
server only. A module is in the client bundle when an island reaches it
through static imports, transitively.

## How fresh-dev classifies modules (`fresh_boundaries`)

| Field | Meaning |
|---|---|
| `boundary` | reachability: `client-entry` (island or client.ts), `client` (reached only from islands), `shared` (reached from islands and from server entries), `server` (reached only from routes/main), `unknown` (nothing imports it) |
| `nature` | what the code itself needs: `server-only` (Deno.*, node: builtins, DB drivers, dotenv…), `browser-only` (window/document/localStorage without a guard), `isomorphic` |
| violations | **B001**: `boundary ∈ {client, shared, client-entry}` and `nature = server-only` — with the import chain island → … → module. **B002**: server module with unguarded browser globals |

What the Vite plugin itself checks at build time is narrower: Node built-ins in
the client environment fail with "Node built-in modules cannot be imported in
the browser" (`verify_imports.ts`), everything else (`Deno.*`, drivers) fails at
runtime in the browser. fresh-dev flags all of them statically.

## Rules of thumb

- Server data reaches an island only as **props** (serializable — see the
  islands skill) or through a `fetch` to an API route.
- A module that both a route and an island import must stay isomorphic: no
  `Deno.`, no drivers, no `window`. Split it if it needs both worlds.
- `IS_BROWSER` (`fresh/runtime` in 2.x, `$fresh/runtime.ts` in 1.x) guards
  browser-only code that must also survive server rendering of the island.
- `Deno.env.get("FRESH_PUBLIC_X")` written literally is inlined into island
  bundles at build time (2.x); any other `Deno.env` read is server-only.
- 2.x Vite: files imported from code go in `assets/`, URL-referenced files in
  `static/` (C009).
- Add project-specific server-only packages to
  `.fresh-dev/config.json` → `serverOnlySpecifiers` so B001 knows them.
