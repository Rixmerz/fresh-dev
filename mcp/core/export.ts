/** Graphify-compatible node-link export for LiveSpec `ingest_external_graph` (plan §11). */
import { join } from "@std/path";
import type { ProjectIndex } from "./index.ts";
import { basename, stripExt } from "./fs.ts";

interface ExportNode {
  id: string;
  label: string;
  source_file: string;
  source_location: string;
  _callable: boolean;
  _origin: "ast";
  fresh_kind?: string;
  fresh_pattern?: string;
}
interface ExportLink {
  source: string;
  target: string;
  relation: string;
  confidence: "EXTRACTED" | "INFERRED";
  confidence_score: number;
  _origin: "ast";
  fresh_edge?: string;
}

export interface ExportResult {
  ok: true;
  path: string;
  nodes: number;
  links: number;
  byRelation: Record<string, number>;
  livespecSnippet: string;
}

/** LiveSpec mints the module basename for an anonymous `export default`. */
export function symbolName(file: string, exportName: string, localName: string | null): string {
  if (exportName !== "default") return exportName;
  if (localName) return localName;
  return stripExt(basename(file));
}

export async function exportGraph(
  index: ProjectIndex,
  opts: { path?: string; relations?: string[] } = {},
): Promise<ExportResult> {
  const rel = opts.path ?? ".fresh-dev/graph.json";
  const wanted = opts.relations ? new Set(opts.relations) : null;
  const nodes = new Map<string, ExportNode>();
  const links: ExportLink[] = [];
  const primary = new Map<string, string>(); // file → node id of its default/first component symbol
  const handlerSyms = new Map<string, string[]>();

  for (const [file, facts] of index.facts) {
    if (facts.isTest) continue;
    const route = index.routeByFile(file);
    for (const e of facts.exports) {
      if (!e.isFunction || e.kind === "reexport") continue;
      const name = symbolName(file, e.name, e.localName);
      const id = `${file}::${name}`;
      const node: ExportNode = {
        id,
        label: name,
        source_file: file,
        source_location: `L${e.line}`,
        _callable: true,
        _origin: "ast",
      };
      if (route) {
        node.fresh_kind = route.kind;
        if (route.pattern) node.fresh_pattern = route.pattern;
      } else if (index.islandFiles.has(file)) node.fresh_kind = "island";
      else if (facts.hasJsx) node.fresh_kind = "component";
      nodes.set(id, node);
      if (e.isDefault || !primary.has(file)) primary.set(file, id);
    }
    if (facts.handler?.shape === "object") {
      const ids: string[] = [];
      for (const m of facts.handler.methods) {
        const id = `${file}::${m}`;
        nodes.set(id, {
          id,
          label: m,
          source_file: file,
          source_location: `L${facts.handler.line}`,
          _callable: true,
          _origin: "ast",
          fresh_kind: "handler",
        });
        ids.push(id);
      }
      handlerSyms.set(file, ids);
    } else if (facts.handler) {
      const id = `${file}::${facts.handler.exportName}`;
      nodes.set(id, {
        id,
        label: facts.handler.exportName,
        source_file: file,
        source_location: `L${facts.handler.line}`,
        _callable: true,
        _origin: "ast",
        fresh_kind: "handler",
      });
      handlerSyms.set(file, [id]);
    }
  }

  const byRelation: Record<string, number> = {};
  const add = (
    source: string | undefined,
    target: string | undefined,
    relation: string,
    inferred: boolean,
    edge: string,
  ) => {
    if (!source || !target || source === target) return;
    if (wanted && !wanted.has(relation)) return;
    links.push({
      source,
      target,
      relation,
      confidence: inferred ? "INFERRED" : "EXTRACTED",
      confidence_score: inferred ? 0.6 : 0.9,
      _origin: "ast",
      fresh_edge: edge,
    });
    byRelation[relation] = (byRelation[relation] ?? 0) + 1;
  };

  for (const e of index.graph.edges) {
    switch (e.kind) {
      case "renders": {
        const exportName = (e.detail ?? "default").split(" ")[0];
        const target = exportName === "default" ? primary.get(e.to) : `${e.to}::${exportName}`;
        add(
          primary.get(e.from),
          target && nodes.has(target) ? target : primary.get(e.to),
          "uses_component",
          e.confidence === "inferred",
          "renders",
        );
        break;
      }
      case "hydrates":
        add(primary.get(e.from), primary.get(e.to), "uses_component", true, "hydrates");
        break;
      case "passes_data":
        for (const h of handlerSyms.get(e.from) ?? []) {
          add(h, primary.get(e.to), "uses", false, "passes_data");
        }
        break;
      case "wraps":
        add(primary.get(e.from), primary.get(e.to), "uses", true, "wraps");
        break;
      case "guards":
        for (const h of handlerSyms.get(e.from) ?? [primary.get(e.from) ?? ""]) {
          add(h || undefined, primary.get(e.to), "uses", true, "guards");
          for (const t of handlerSyms.get(e.to) ?? []) {
            add(h || undefined, t, "uses", true, "guards");
          }
        }
        break;
      case "imports":
        if (e.to.startsWith("ext:")) break;
        add(
          primary.get(e.from) ?? e.from,
          primary.get(e.to) ?? e.to,
          "imports",
          e.confidence === "inferred",
          "imports",
        );
        break;
      default:
        break;
    }
  }
  // file-level nodes for import links whose files have no symbol
  for (const l of links) {
    for (const id of [l.source, l.target]) {
      if (!nodes.has(id) && !id.includes("::")) {
        nodes.set(id, {
          id,
          label: basename(id),
          source_file: id,
          source_location: "L1",
          _callable: false,
          _origin: "ast",
          fresh_kind: "module",
        });
      }
    }
  }

  const doc = {
    directed: true,
    multigraph: false,
    graph: {
      generator: "fresh-dev",
      fresh: index.detection.freshVersion ?? index.version,
      workspace: basename(index.workspace),
      exported_at: new Date().toISOString(),
    },
    nodes: [...nodes.values()],
    links,
  };
  const abs = join(index.workspace, rel);
  await Deno.mkdir(join(index.workspace, ".fresh-dev"), { recursive: true });
  await Deno.writeTextFile(abs, JSON.stringify(doc, null, 1));
  return {
    ok: true,
    path: rel,
    nodes: nodes.size,
    links: links.length,
    byRelation,
    livespecSnippet: `[graph]\nexternal = "${rel}"\nauto_ingest = true`,
  };
}
