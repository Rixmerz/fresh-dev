/** Server/client boundary classification (plan §4.3). */
import type {
  BoundaryInfo,
  BoundaryViolation,
  ModuleFacts,
  ProjectGraph,
  RouteEntry,
  SignalFact,
} from "./types.ts";
import { chainTo, reachImports } from "./graph.ts";

export interface BoundaryInput {
  files: Set<string>;
  facts: Map<string, ModuleFacts>;
  graph: ProjectGraph;
  routes: RouteEntry[];
  clientEntries: Set<string>;
  serverEntries: Set<string>;
}

export function serverSignalsOf(f: ModuleFacts): SignalFact[] {
  return f.signals.filter((s) =>
    s.kind === "deno-api" || s.kind === "node-builtin" || s.kind === "server-specifier"
  );
}

export function browserSignalsOf(f: ModuleFacts): SignalFact[] {
  return f.signals.filter((s) => s.kind === "browser-global" && !s.guarded);
}

export function computeBoundaries(input: BoundaryInput): {
  boundaries: Map<string, BoundaryInfo>;
  violations: BoundaryViolation[];
} {
  const { files, facts, graph, clientEntries, serverEntries } = input;
  const reachableFrom = new Map<string, string[]>();
  const parentsByEntry = new Map<string, Map<string, string | null>>();
  for (const entry of clientEntries) {
    const parents = reachImports(graph, entry);
    parentsByEntry.set(entry, parents);
    for (const f of parents.keys()) {
      const list = reachableFrom.get(f) ?? [];
      list.push(entry);
      reachableFrom.set(f, list);
    }
  }
  const serverReach = new Set<string>();
  for (const entry of serverEntries) {
    for (const f of reachImports(graph, entry).keys()) serverReach.add(f);
  }

  const boundaries = new Map<string, BoundaryInfo>();
  const violations: BoundaryViolation[] = [];
  const routeFiles = new Set(input.routes.map((r) => r.file));

  for (const f of files) {
    const fact = facts.get(f);
    if (!fact) continue;
    const srv = serverSignalsOf(fact);
    const brw = browserSignalsOf(fact);
    const from = reachableFrom.get(f) ?? [];
    let boundary: BoundaryInfo["boundary"];
    if (clientEntries.has(f)) boundary = "client-entry";
    else if (from.length > 0) boundary = serverReach.has(f) ? "shared" : "client";
    else if (serverReach.has(f)) boundary = "server";
    else boundary = "unknown";
    boundaries.set(f, {
      file: f,
      boundary,
      nature: srv.length ? "server-only" : brw.length ? "browser-only" : "isomorphic",
      serverSignals: srv,
      browserSignals: brw,
      reachableFrom: from,
      reachableFromServer: serverReach.has(f),
    });

    // B001: client-reachable module with server-only signals
    if (from.length > 0 && srv.length > 0) {
      for (const entry of from) {
        const chain = chainTo(parentsByEntry.get(entry)!, f);
        const s = srv[0];
        violations.push({
          id: "B001",
          severity: "error",
          file: f,
          line: s.line,
          chain,
          signal: s,
          message: chain.length > 1
            ? `${f} is bundled for the browser through ${chain[0]} but uses ${describe(s)}`
            : `island ${f} uses ${describe(s)}; it runs in the browser`,
        });
      }
    }
    // B002: server-only module (route/layout/middleware/app) using browser globals without a guard
    if (from.length === 0 && brw.length > 0 && (routeFiles.has(f) || serverReach.has(f))) {
      const s = brw[0];
      violations.push({
        id: "B002",
        severity: "warning",
        file: f,
        line: s.line,
        chain: [f],
        signal: s,
        message:
          `${f} runs only on the server but references \`${s.detail}\` without an IS_BROWSER guard`,
      });
    }
  }
  return { boundaries, violations };
}

export function describe(s: SignalFact): string {
  switch (s.kind) {
    case "deno-api":
      return `\`${s.detail}\` (Deno API)`;
    case "node-builtin":
      return `\`${s.detail}\` (Node built-in — the Vite plugin rejects it in the client bundle)`;
    case "server-specifier":
      return `\`${s.detail}\` (server-only dependency)`;
    case "browser-global":
      return `\`${s.detail}\` (browser global)`;
    case "public-env":
      return `\`${s.detail}\` (FRESH_PUBLIC_* inlined)`;
  }
}
