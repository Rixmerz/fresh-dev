/**
 * File-system routing model for Fresh 1.x and 2.x (plan §4.4).
 * `pathToPattern` and `sortRoutePaths` mirror `packages/fresh/src/router.ts` /
 * `fs_crawl.ts` (2.x) and `src/server/fs_extract.ts` (1.x).
 */
import type { FreshVersion, ModuleFacts, RouteEntry, RouteKind } from "./types.ts";
import { basename, dirname, isSourceFile, stripExt, TEST_FILE_PATTERN } from "./fs.ts";

export const GROUP_REG = /(^|\/)\((_[^/]+)\)(\/|$)/;

export interface PatternResult {
  pattern: string;
  params: string[];
  catchAll: boolean;
  optional: boolean;
}

/** Fresh's `pathToPattern`. `path` is routes-relative without extension and without leading `/`. */
export function pathToPattern(path: string, opts: { keepGroups?: boolean } = {}): PatternResult {
  const parts = path.split("/").filter((p) => p !== "");
  const params: string[] = [];
  let catchAll = false;
  let optional = false;
  if (parts[parts.length - 1] === "index") {
    if (parts.length === 1) return { pattern: "/", params, catchAll, optional };
    parts.pop();
  }
  let route = "";
  for (const part of parts) {
    if (part.startsWith("[...") && part.endsWith("]")) {
      const name = part.slice(4, -1);
      params.push(name);
      catchAll = true;
      route += `/:${name}*`;
      continue;
    }
    if (!opts.keepGroups && part.startsWith("(") && part.endsWith(")")) continue;
    if (part.includes("][")) {
      throw new SyntaxError(`Invalid route pattern: adjacent params in "${part}"`);
    }
    if (part.startsWith("[[") && part.endsWith("]]")) {
      const name = part.slice(2, -2);
      params.push(name);
      optional = true;
      route += route === "" ? `/{:${name}}?` : `{/:${name}}?`;
      continue;
    }
    // mixed literal / param segments: [id]-asdf, asdf[bar], [id]@[bar]
    let seg = "";
    let i = 0;
    while (i < part.length) {
      const c = part[i];
      if (c === "[") {
        const end = part.indexOf("]", i);
        if (end < 0) throw new SyntaxError(`Invalid route pattern: unclosed "[" in "${part}"`);
        const name = part.slice(i + 1, end);
        params.push(name);
        seg += `:${name}`;
        i = end + 1;
      } else {
        seg += c;
        i++;
      }
    }
    route += "/" + seg;
  }
  return { pattern: route === "" ? "/" : route, params, catchAll, optional };
}

/** Sort weight of a route-path segment, per version (higher first). */
function segmentScore(seg: string, version: FreshVersion): number {
  const isIndex = seg === "index";
  if (version === "2") {
    if (seg === "_middleware") return 6;
    if (seg.startsWith("_") && seg !== "_error") return 5;
    if (seg === "_error") return 4;
    if (isIndex) return 3;
    if (seg.startsWith("[...")) return 0;
    if (seg.startsWith("[")) return 1;
    if (seg.startsWith("(")) return 1.5; // group: after literal, before params
    return 2;
  }
  if (seg === "_middleware") return 4;
  if (seg.startsWith("_")) return 3;
  if (seg.startsWith("[...")) return 0;
  if (seg.startsWith("[")) return 1;
  return 2;
}

/** Registration order used by Fresh (`sortRoutePaths`): `_app` first, then by segment scores. */
export function sortRoutePaths(a: string, b: string, version: FreshVersion): number {
  const aApp = a === "/_app" || a.endsWith("/_app");
  const bApp = b === "/_app" || b.endsWith("/_app");
  if (aApp !== bApp) return aApp ? -1 : 1;
  const as = a.split("/").filter(Boolean);
  const bs = b.split("/").filter(Boolean);
  const n = Math.max(as.length, bs.length);
  for (let i = 0; i < n; i++) {
    const x = as[i];
    const y = bs[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    const sx = segmentScore(x, version);
    const sy = segmentScore(y, version);
    if (sx !== sy) return sy - sx;
    return x < y ? -1 : 1;
  }
  return 0;
}

export type SpecialName = "_app" | "_layout" | "_middleware" | "_404" | "_500" | "_error";

export function classifyRouteFile(id: string, version: FreshVersion): RouteKind | "ignored" {
  const name = basename(id);
  if (name === "_middleware") return "middleware";
  if (name === "_layout") return "layout";
  if (name === "_app") return "app";
  if (name === "_404") return "notFound";
  if (name === "_500") return "error";
  if (name === "_error") return version === "2" ? "error" : "ignored";
  if (name.startsWith("_")) return "ignored";
  return "page"; // refined later with handler/page facts
}

/** Files under routes/ that the crawler considers (plan §4.4). */
export function isRouteCandidate(relToRoutes: string): boolean {
  if (!isSourceFile(relToRoutes)) return false;
  if (TEST_FILE_PATTERN.test(relToRoutes)) return false;
  if (GROUP_REG.test(relToRoutes)) return false; // (_islands)/(_components)/…
  return true;
}

export function isColocatedIsland(relToRoutes: string): boolean {
  return /(^|\/)\(_islands\)\//.test(relToRoutes) && isSourceFile(relToRoutes) &&
    !TEST_FILE_PATTERN.test(relToRoutes);
}

export function groupOf(id: string): string | null {
  const m = id.match(/\(([^_/][^/]*)\)/);
  return m ? `(${m[1]})` : null;
}

export interface BuildRoutesInput {
  version: FreshVersion;
  routesDir: string; // workspace-relative, e.g. "routes"
  files: string[]; // workspace-relative route files
  facts: Map<string, ModuleFacts>;
}

/**
 * Build RouteEntry objects (without graph-derived fields such as renders/islands).
 * Layout/middleware/app/error chains are attached here from the directory tree.
 */
export function buildRoutes(input: BuildRoutesInput): RouteEntry[] {
  const { version, routesDir, facts } = input;
  const entries: RouteEntry[] = [];
  const prefix = routesDir.replace(/\/$/, "") + "/";

  for (const file of input.files) {
    if (!file.startsWith(prefix)) continue;
    const relToRoutes = file.slice(prefix.length);
    if (!isRouteCandidate(relToRoutes)) continue;
    const id = "/" + stripExt(relToRoutes);
    const kind0 = classifyRouteFile(id, version);
    if (kind0 === "ignored") continue;
    const f = facts.get(file);
    const scope = dirname(id).replace(/^\/?/, "/") || "/";
    let kind: RouteKind = kind0;
    const hasPage = !!f?.exports.find((e) => e.isDefault && e.isFunction);
    const hasHandler = !!f?.handler;
    if (kind0 === "page") {
      if (hasPage && hasHandler) kind = "page+handler";
      else if (hasPage) kind = "page";
      else if (hasHandler || f?.config) kind = "api";
      else kind = "page"; // invalid (R002) but still a route candidate
    }
    let filePattern: string | null = null;
    let params: string[] = [];
    let catchAll = false;
    let optional = false;
    let confidence: RouteEntry["confidence"] = "extracted";
    const extra: string[] = [];
    if (kind0 === "page" || kind0 === "notFound" || kind0 === "error") {
      try {
        const r = pathToPattern(id.slice(1), { keepGroups: false });
        filePattern = r.pattern;
        params = r.params;
        catchAll = r.catchAll;
        optional = r.optional;
      } catch (e) {
        extra.push(`pattern error: ${(e as Error).message}`);
        filePattern = null;
      }
    }
    let pattern = filePattern;
    if (f?.config?.routeOverride) {
      pattern = f.config.routeOverride;
      params = [...f.config.routeOverride.matchAll(/:([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
      catchAll = /\*/.test(f.config.routeOverride);
    } else if (f?.config?.routeOverrideNonLiteral) {
      confidence = "inferred";
      extra.push("routeOverride is not a literal; pattern shown is the file-derived one");
    }
    // methods
    let methods: string[] = [];
    if (f?.handler?.shape === "object") methods = f.handler.methods.map((m) => m.toUpperCase());
    else if (f?.handler?.shape === "function") methods = ["ALL"];
    else if (hasPage) methods = ["GET"];
    if (hasPage && !methods.includes("GET") && !methods.includes("ALL")) methods.push("GET");
    if (methods.includes("GET") && !methods.includes("HEAD") && !methods.includes("ALL")) {
      methods.push("HEAD");
    }
    if (kind === "middleware" || kind === "layout" || kind === "app") methods = [];

    const routable = kind === "page" || kind === "api" || kind === "page+handler";
    if (!routable) methods = [];
    entries.push({
      file,
      id,
      kind,
      pattern: routable ? pattern : null,
      filePattern,
      scope: kind === "middleware" || kind === "layout" || kind === "error" || kind === "notFound"
        ? scope
        : dirname(id) || "/",
      group: groupOf(id),
      methods,
      hasPage,
      hasHandler,
      handlerShape: f?.handler?.shape ?? null,
      handlerCount: kind === "middleware" ? middlewareCount(f) : null,
      config: f?.config ?? null,
      params,
      catchAll,
      optional,
      layouts: [],
      middlewares: [],
      app: null,
      errorRoute: null,
      renders: [],
      islands: [],
      confidence,
      eager: version === "2" ? !!f?.containsRouteOverrideText : true,
      registeredAt: null,
      extra,
    });
  }

  attachWrappers(entries, version);
  entries.sort((a, b) => sortRoutePaths(a.id, b.id, version));
  return entries;
}

function middlewareCount(f: ModuleFacts | undefined): number {
  if (!f) return 0;
  if (f.handler?.shape === "array") return f.handler.arrayLength ?? 0;
  if (f.handler) return 1;
  const def = f.exports.find((e) => e.isDefault);
  if (!def) return 0;
  if (def.arrayLength !== null) return def.arrayLength;
  return def.isFunction || def.defineWrapper === "middleware" ? 1 : 0;
}

function scopeDir(id: string): string {
  const d = dirname(id);
  return d === "" ? "/" : d;
}

/** Attach app / layouts / middlewares / error route to every page-like entry. */
export function attachWrappers(entries: RouteEntry[], version: FreshVersion): void {
  const app = entries.find((e) => e.kind === "app" && scopeDir(e.id) === "/") ?? null;
  const layouts = entries.filter((e) => e.kind === "layout");
  const middlewares = entries.filter((e) => e.kind === "middleware" && !e.registeredAt);
  const errors = entries.filter((e) => e.kind === "error");
  const inScope = (scope: string, dir: string) =>
    scope === "/" ? true : dir === scope || dir.startsWith(scope + "/");
  const depth = (s: string) => s === "/" ? 0 : s.split("/").length - 1;

  for (const e of entries) {
    if (e.kind === "middleware" || e.kind === "layout" || e.kind === "app") continue;
    const dir = scopeDir(e.id);
    // middlewares root → leaf
    e.middlewares = middlewares
      .filter((m) => inScope(m.scope, dir))
      .sort((a, b) => depth(a.scope) - depth(b.scope))
      .map((m) => m.file);
    // layouts outer → inner, honouring skipInheritedLayouts on layouts and on the route
    let chain = layouts
      .filter((l) => inScope(l.scope, dir))
      .sort((a, b) => depth(a.scope) - depth(b.scope));
    for (let i = chain.length - 1; i >= 0; i--) {
      if (chain[i].config?.skipInheritedLayouts) {
        chain = chain.slice(i);
        break;
      }
    }
    if (e.config?.skipInheritedLayouts) chain = [];
    e.layouts = chain.map((l) => l.file);
    e.app = e.config?.skipAppWrapper ? null : app?.file ?? null;
    if (e.kind !== "error" && e.kind !== "notFound") {
      const err = errors
        .filter((x) => inScope(x.scope, dir))
        .sort((a, b) => depth(b.scope) - depth(a.scope))[0];
      e.errorRoute = err?.file ?? null;
    }
    void version;
  }
}

/** Parse a 1.x `fresh.gen.ts` manifest: the route and island file paths it references. */
export function parseManifest(text: string): { routes: string[]; islands: string[] } {
  const routes: string[] = [];
  const islands: string[] = [];
  const sectionRe = /(routes|islands)\s*:\s*\{([\s\S]*?)\}/g;
  let m: RegExpExecArray | null;
  while ((m = sectionRe.exec(text))) {
    const keys = [...m[2].matchAll(/"(\.\/[^"]+)"\s*:/g)].map((k) => k[1].replace(/^\.\//, ""));
    if (m[1] === "routes") routes.push(...keys);
    else islands.push(...keys);
  }
  return { routes, islands };
}

/** Fresh's identifier rule for fresh.gen.ts (`specifierToIdentifier`), for tests/docs. */
export function manifestIdentifier(specifier: string): string {
  const stripped = specifier.replace(/^\.\/(routes|islands)\//, "").replace(/\.[jt]sx?$/, "");
  let id = stripped.replace(/[^A-Za-z0-9_$]+/g, "_").replace(/_+/g, "_");
  if (/^[0-9]/.test(id)) id = "_" + id;
  return "$" + id;
}
