/** Project graph: import edges, JSX render edges, hydration, wrappers (plan §4.3). */
import type {
  DenoConfig,
  EdgeKind,
  GraphEdge,
  GraphNode,
  ModuleFacts,
  NodeKind,
  ProjectGraph,
  RouteEntry,
} from "./types.ts";
import { resolveSpecifier } from "./resolve.ts";
import { basename } from "./fs.ts";

export interface GraphInput {
  files: Set<string>;
  facts: Map<string, ModuleFacts>;
  config: DenoConfig;
  routes: RouteEntry[];
  islandFiles: Set<string>;
  clientEntries: Set<string>;
  staticDirs: string[];
  assetFiles: Set<string>;
}

function routeNodeKind(kind: RouteEntry["kind"]): NodeKind {
  switch (kind) {
    case "layout":
      return "layout";
    case "middleware":
      return "middleware";
    case "app":
      return "app";
    case "error":
    case "notFound":
      return "error";
    default:
      return "route";
  }
}

export function isComponentTag(tag: string): boolean {
  return /^[A-Z]/.test(tag) || tag.includes(".");
}

export function buildGraph(input: GraphInput): ProjectGraph {
  const { files, facts, config, routes, islandFiles } = input;
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const importsOf: ProjectGraph["importsOf"] = new Map();
  const importedBy: ProjectGraph["importedBy"] = new Map();
  const externalsOf: ProjectGraph["externalsOf"] = new Map();
  const unresolved: ProjectGraph["unresolved"] = [];

  const routeByFile = new Map(routes.map((r) => [r.file, r]));
  const addNode = (n: GraphNode) => {
    if (!nodes.has(n.id)) nodes.set(n.id, n);
  };
  const addEdge = (
    from: string,
    to: string,
    kind: EdgeKind,
    line: number | null,
    confidence: GraphEdge["confidence"],
    detail: string | null = null,
  ) => {
    edges.push({ from, to, kind, line, confidence, detail });
  };

  // ---- nodes ----
  for (const f of files) {
    const fact = facts.get(f);
    let kind: NodeKind = "module";
    const r = routeByFile.get(f);
    if (r) kind = routeNodeKind(r.kind);
    else if (islandFiles.has(f)) kind = "island";
    else if (fact?.hasJsx && fact.exports.some((e) => e.isFunction)) kind = "component";
    addNode({ id: f, kind, file: f, specifier: null, scheme: null });
  }

  // ---- import edges ----
  for (const f of files) {
    const fact = facts.get(f);
    if (!fact) continue;
    for (const imp of fact.imports) {
      if (
        imp.isTypeOnly ||
        imp.names.length > 0 && imp.names.every((n) => n.isType) && !imp.default &&
          !imp.namespace && !imp.reexport
      ) {
        continue; // erased at runtime
      }
      const res = resolveSpecifier(imp.specifier, f, config);
      if (res.kind === "local") {
        if (files.has(res.path)) {
          addEdge(
            f,
            res.path,
            "imports",
            imp.line,
            imp.dynamic ? "inferred" : "extracted",
            imp.dynamic ? "dynamic import" : null,
          );
          const list = importsOf.get(f) ?? [];
          list.push({ target: res.path, line: imp.line, dynamic: imp.dynamic, typeOnly: false });
          importsOf.set(f, list);
          const by = importedBy.get(res.path) ?? [];
          if (!by.includes(f)) by.push(f);
          importedBy.set(res.path, by);
        } else if (input.assetFiles.has(res.path)) {
          addNode({
            id: "asset:" + res.path,
            kind: "asset",
            file: res.path,
            specifier: null,
            scheme: null,
          });
          addEdge(
            f,
            "asset:" + res.path,
            "references_asset",
            imp.line,
            "extracted",
            "imported asset",
          );
        } else {
          unresolved.push({
            file: f,
            specifier: imp.specifier,
            line: imp.line,
            reason: `file not found: ${res.path}`,
          });
        }
      } else if (res.kind === "external") {
        const id = "ext:" + res.specifier;
        addNode({ id, kind: "external", file: null, specifier: res.specifier, scheme: res.scheme });
        addEdge(
          f,
          id,
          "imports",
          imp.line,
          "extracted",
          imp.specifier !== res.specifier ? `via import map: ${imp.specifier}` : null,
        );
        const list = externalsOf.get(f) ?? [];
        list.push({ specifier: res.specifier, scheme: res.scheme, line: imp.line });
        externalsOf.set(f, list);
      } else {
        unresolved.push({ file: f, specifier: imp.specifier, line: imp.line, reason: res.reason });
      }
    }
  }

  // ---- render edges (JSX tag → imported module) ----
  const rendersOf = new Map<
    string,
    { target: string; line: number; exportName: string; confidence: GraphEdge["confidence"] }[]
  >();
  for (const f of files) {
    const fact = facts.get(f);
    if (!fact?.hasJsx) continue;
    // local binding → (specifier, imported export name)
    const bindings = new Map<string, { spec: string; exportName: string }>();
    for (const imp of fact.imports) {
      if (imp.dynamic || imp.reexport) continue;
      if (imp.default) bindings.set(imp.default, { spec: imp.specifier, exportName: "default" });
      if (imp.namespace) bindings.set(imp.namespace, { spec: imp.specifier, exportName: "*" });
      for (const n of imp.names) {
        if (!n.isType) bindings.set(n.local, { spec: imp.specifier, exportName: n.imported });
      }
    }
    const seen = new Set<string>();
    for (const use of fact.jsx) {
      if (!isComponentTag(use.tag)) continue;
      const [head, ...restParts] = use.tag.split(".");
      const b = bindings.get(head);
      if (!b) continue;
      const exportName = b.exportName === "*" ? restParts[0] ?? "default" : b.exportName;
      const res = resolveSpecifier(b.spec, f, config);
      if (res.kind !== "local" || !files.has(res.path)) continue;
      // follow one barrel hop: `export { default as X } from "../islands/X.tsx"`
      let target = res.path;
      let confidence: GraphEdge["confidence"] = "extracted";
      const tf = facts.get(target);
      const re = tf?.exports.find((e) =>
        e.name === exportName && e.kind === "reexport" && e.reexportFrom
      );
      if (re && re.reexportFrom) {
        const r2 = resolveSpecifier(re.reexportFrom, target, config);
        if (r2.kind === "local" && files.has(r2.path)) {
          target = r2.path;
          confidence = "inferred";
        }
      }
      const key = `${target}#${exportName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      addEdge(
        f,
        target,
        "renders",
        use.line,
        confidence,
        exportName + (confidence === "inferred" ? " (via barrel)" : ""),
      );
      const list = rendersOf.get(f) ?? [];
      list.push({ target, line: use.line, exportName, confidence });
      rendersOf.set(f, list);
    }
  }

  // ---- hydration: routes/layouts/app → islands (transitive through components) ----
  function islandsReachableFrom(start: string): Map<string, { depth: number; via: string[] }> {
    const found = new Map<string, { depth: number; via: string[] }>();
    const queue: { file: string; depth: number; via: string[] }[] = [{
      file: start,
      depth: 0,
      via: [],
    }];
    const visited = new Set<string>([start]);
    while (queue.length) {
      const cur = queue.shift()!;
      for (const r of rendersOf.get(cur.file) ?? []) {
        if (islandFiles.has(r.target)) {
          if (!found.has(r.target)) found.set(r.target, { depth: cur.depth + 1, via: cur.via });
          continue; // islands inside islands are the island's own concern
        }
        if (visited.has(r.target)) continue;
        visited.add(r.target);
        queue.push({ file: r.target, depth: cur.depth + 1, via: [...cur.via, r.target] });
      }
    }
    return found;
  }

  for (const r of routes) {
    r.renders = (rendersOf.get(r.file) ?? []).map((x) => x.target).filter((v, i, a) =>
      a.indexOf(v) === i
    );
    const own = islandsReachableFrom(r.file);
    for (const [isl, info] of own) {
      addEdge(
        r.file,
        isl,
        "hydrates",
        null,
        info.depth === 1 ? "extracted" : "inferred",
        info.via.length ? `via ${info.via.join(" → ")}` : null,
      );
    }
    const all = new Set(own.keys());
    if (r.kind !== "layout" && r.kind !== "middleware" && r.kind !== "app") {
      for (const wrapper of [...r.layouts, ...(r.app ? [r.app] : [])]) {
        for (const [isl] of islandsReachableFrom(wrapper)) {
          if (!all.has(isl)) {
            all.add(isl);
            addEdge(r.file, isl, "hydrates", null, "inferred", `via ${basename(wrapper)}`);
          }
        }
      }
    }
    r.islands = [...all];
  }

  // ---- wrappers ----
  for (const r of routes) {
    if (r.kind === "layout" || r.kind === "middleware" || r.kind === "app") continue;
    if (r.app) addEdge(r.app, r.file, "wraps", null, "extracted", "app wrapper");
    for (const l of r.layouts) addEdge(l, r.file, "wraps", null, "extracted", "layout");
    for (const m of r.middlewares) addEdge(m, r.file, "guards", null, "extracted", "middleware");
    const fact = facts.get(r.file);
    if (
      fact?.handler && r.hasPage &&
      fact.renderCalls.some((c) => c.kind === "ctx.render" || c.kind === "page")
    ) {
      addEdge(r.file, r.file, "passes_data", fact.handler.line, "extracted", "handler → page");
    }
  }

  // ---- asset references ----
  for (const f of files) {
    const fact = facts.get(f);
    if (!fact) continue;
    for (const ref of fact.assetRefs) {
      const clean = ref.path.split("?")[0];
      for (const dir of input.staticDirs) {
        const candidate = dir.replace(/\/$/, "") + clean;
        if (input.assetFiles.has(candidate)) {
          addNode({
            id: "asset:" + candidate,
            kind: "asset",
            file: candidate,
            specifier: null,
            scheme: null,
          });
          addEdge(f, "asset:" + candidate, "references_asset", ref.line, "extracted", null);
          break;
        }
      }
    }
  }

  return { nodes, edges, importsOf, importedBy, externalsOf, unresolved };
}

/** Files reachable from `start` by following runtime imports (BFS). Returns parent pointers. */
export function reachImports(
  graph: ProjectGraph,
  start: string,
  opts: { includeDynamic?: boolean } = {},
): Map<string, string | null> {
  const parents = new Map<string, string | null>([[start, null]]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const e of graph.importsOf.get(cur) ?? []) {
      if (e.dynamic && opts.includeDynamic === false) continue;
      if (parents.has(e.target)) continue;
      parents.set(e.target, cur);
      queue.push(e.target);
    }
  }
  return parents;
}

export function chainTo(parents: Map<string, string | null>, target: string): string[] {
  const chain: string[] = [];
  let cur: string | null | undefined = target;
  while (cur) {
    chain.unshift(cur);
    cur = parents.get(cur) ?? null;
  }
  return chain;
}
