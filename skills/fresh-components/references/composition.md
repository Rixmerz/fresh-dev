# Component composition — reference

Derived from the repository's earlier component-composition guide, reduced to what holds for both Fresh versions. Names are generic.

## 1. Two shapes of a page

**Composed** (preferred): the route file renders a handful of components and passes what varies as props.

```tsx
// routes/index.tsx
import Header from "../components/Header.tsx";
import Hero from "../components/Hero.tsx";
import Features from "../components/Features.tsx";
import Footer from "../components/Footer.tsx";

export default function Home() {
  return (
    <>
      <Header />
      <Hero title="..." subtitle="..." ctaHref="#start" />
      <Features />
      <Footer />
    </>
  );
}
```

**Monolithic**: one route file with every section inline. It renders the same HTML; the cost is reuse, review size and testability. C001 flags a route with a large JSX block and no components. Acceptable for a throwaway single page; convert as soon as a second page wants any section.

## 2. Extracting a section

1. `fresh_route(workspace="/abs/path", file="routes/index.tsx")` — confirm the route has no `hydrates` inside the section. If it does, the interactive part is an island: extract the static shell as a component and render the island inside it.
2. `fresh_components(workspace="/abs/path", name="Hero")` and livespec `search_similar` (when mounted) — the section may already exist under another name.
3. Move the JSX into `components/Hero.tsx`: one named function export, `class` attributes unchanged.
4. Replace the inline block with `<Hero ... />`; keep the import style the repo uses (relative in 1.x; the `@/` alias is available in 2.x).
5. `fresh_validate(workspace="/abs/path", categories=["conventions", "boundaries"], files=["components/Hero.tsx", "routes/index.tsx"])`, `deno check`, `deno lint`.

## 3. Props versus inline content

| Use props when | Keep inline when |
|---|---|
| content varies across pages | content is static and unique to one page |
| the component is rendered in more than one place | the component is used once |
| content comes from a handler (`data`) or a CMS | content is tightly coupled to the markup |

```tsx
// components/Hero.tsx
import type { ComponentChildren } from "preact";

interface HeroProps {
  title: string;
  subtitle: string;
  ctaHref: string;
  children?: ComponentChildren;
}

export default function Hero({ title, subtitle, ctaHref, children }: HeroProps) {
  return (
    <section class="relative">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <a href={ctaHref}>Start</a>
      {children}
    </section>
  );
}
```

No `onClick`, no hooks: this file is server-rendered (I004). If the CTA must react in the browser, the button becomes an island rendered as `children` or beside the component.

## 4. Naming

- File and export share a PascalCase name (`Hero.tsx` → `Hero`); props interface `<Name>Props`.
- Named function declarations, not anonymous arrows: livespec maps `.fresh-dev/graph.json` nodes by `(source_file, line)` and `(source_file, label)`, and an anonymous default export gets the module basename as its label. In 2.x, `export default define.page(function Home() { ... })` keeps `Home` mappable; `define.page(() => ...)` may map to nothing.
- No `utils`, `helpers`, `common` buckets (engineering-baseline). A folder per feature (`components/blog/`, `components/checkout/`) is fine: the crawler ignores `components/` entirely, so depth costs nothing.

## 5. Boundary awareness when composing

- A component imported by an island is bundled for the browser. `fresh_components(only="shared")` lists those reachable from both islands and routes; each must be free of `Deno.*`, `node:`, DB drivers, `$std/dotenv` (B001) and of unguarded `window`/`document` (B002).
- A component imported only by routes and layouts may use server APIs freely; it is `server`.
- Barrels (`components/index.ts`) make every importer of one component pull the whole folder into the client closure (I006) and hide island imports (I005). Import by file.

## 6. Version notes

- `class`, not `className`: Preact accepts both; the Fresh convention is `class` (C005).
- 2.x `jsx: "precompile"` with `jsxPrecompileSkipElements` in `deno.json`; 1.x `jsx: "react-jsx"`. Both with `jsxImportSource: "preact"` (D004). Nothing in component code changes between the two.
- `<Head>` from `fresh/runtime` (2.x) or `$fresh/runtime.ts` (1.x) inside a component sets `<title>`/`<meta>` from within the page tree; in 2.x the base `<head>` shell lives in `routes/_app.tsx`.
- `asset("/logo.svg")` from the same runtime module adds the cache-busting query.
