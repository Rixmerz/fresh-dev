/** `fresh_impact`: what a set of changed files reaches, in Fresh terms (plan §4.6). */
import type { ProjectIndex } from "./index.ts";
import type { BoundaryViolation, RouteEntry } from "./types.ts";
import { basename } from "./fs.ts";

export interface ImpactResult {
  ok: true;
  changed: string[];
  routes: { file: string; pattern: string | null; kind: string; why: string[] }[];
  islands: { file: string; name: string; why: string[] }[];
  wrappers: { file: string; kind: string; scope: string; routesUnderScope: number }[];
  boundaryRisks: BoundaryViolation[];
  configChanges: string[];
  suggestedChecks: string[];
  relatedTests: string[];
  affectedFiles: { file: string; distance: number; chain: string[] }[];
}

export function computeImpact(index: ProjectIndex, changedIn: string[], depth = 3): ImpactResult {
  const changed = changedIn.map((f) => f.replace(/^\.\//, "")).filter((f, i, a) =>
    a.indexOf(f) === i
  );
  const routes = new Map<
    string,
    { file: string; pattern: string | null; kind: string; why: string[] }
  >();
  const islands = new Map<string, { file: string; name: string; why: string[] }>();
  const wrappers = new Map<
    string,
    { file: string; kind: string; scope: string; routesUnderScope: number }
  >();
  const configChanges: string[] = [];
  const affected = new Map<string, { distance: number; chain: string[] }>();

  const addRoute = (r: RouteEntry, why: string) => {
    const cur = routes.get(r.file) ?? { file: r.file, pattern: r.pattern, kind: r.kind, why: [] };
    if (!cur.why.includes(why)) cur.why.push(why);
    routes.set(r.file, cur);
  };
  const addIsland = (file: string, why: string) => {
    const isl = index.islands.filter((i) => i.file === file);
    const name = isl.map((i) => i.name).join(", ") || basename(file);
    const cur = islands.get(file) ?? { file, name, why: [] };
    if (!cur.why.includes(why)) cur.why.push(why);
    islands.set(file, cur);
  };

  // reverse import closure
  for (const f of changed) {
    affected.set(f, { distance: 0, chain: [f] });
    for (const [imp, chain] of index.importersOf(f, depth)) {
      const prev = affected.get(imp);
      if (!prev || prev.distance > chain.length - 1) {
        affected.set(imp, { distance: chain.length - 1, chain });
      }
    }
  }

  const d = index.detection;
  for (const f of changed) {
    if (f === d.denoConfigPath) {
      configChanges.push(`${f}: import map / compiler options — every module can be affected`);
    }
    if (f === d.entry.manifest) {
      configChanges.push(`${f}: 1.x manifest — route and island registration`);
    }
    if (f === d.entry.main) {
      configChanges.push(`${f}: app entry — programmatic routes, global middlewares, fsRoutes()`);
    }
    if (f === d.entry.vite) {
      configChanges.push(`${f}: build configuration (islands dir, static dirs, plugins)`);
    }
    if (f === d.entry.dev) configChanges.push(`${f}: builder configuration`);
    if (f === d.entry.client) configChanges.push(`${f}: client entry — every page's CSS/JS`);
    if (f === d.entry.config) configChanges.push(`${f}: fresh.config.ts plugins`);
  }

  for (const [file, info] of affected) {
    const why = info.distance === 0
      ? "changed"
      : `imports ${info.chain[info.chain.length - 2]} (distance ${info.distance})`;
    const r = index.routeByFile(file);
    if (r) {
      if (
        r.kind === "layout" || r.kind === "middleware" || r.kind === "app" || r.kind === "error" ||
        r.kind === "notFound"
      ) {
        const under = index.routes.filter((x) =>
          x.kind !== "layout" && x.kind !== "middleware" && x.kind !== "app" &&
          (x.layouts.includes(file) || x.middlewares.includes(file) || x.app === file ||
            x.errorRoute === file)
        );
        wrappers.set(file, { file, kind: r.kind, scope: r.scope, routesUnderScope: under.length });
        for (const x of under) {
          addRoute(x, `${r.kind} ${basename(file)} ${why === "changed" ? "changed" : why}`);
        }
      } else {
        addRoute(r, why);
      }
    }
    if (index.islandFiles.has(file)) {
      addIsland(
        file,
        why === "changed" ? "changed — client bundle changes" : `${why} — client bundle changes`,
      );
      for (const x of index.routes) {
        if (x.islands.includes(file)) addRoute(x, `hydrates ${basename(file)}`);
      }
    }
    // components: routes/islands rendering them (direct render edges; transitive through renders)
    const renderers = rendersClosure(index, file);
    for (const rf of renderers) {
      const rr = index.routeByFile(rf);
      if (rr) addRoute(rr, `renders ${basename(file)}${info.distance ? ` (${why})` : ""}`);
      if (index.islandFiles.has(rf)) addIsland(rf, `renders ${basename(file)}`);
    }
    // 2.x programmatic routes live in main.ts
    if (file === d.entry.main) {
      for (const x of index.routes) {
        if (x.kind === "programmatic") addRoute(x, "registered in main.ts");
      }
    }
  }

  const boundaryRisks = index.violations.filter((v) => v.chain.some((c) => affected.has(c)));
  const relatedTests = [...affected.keys()].filter((f) => index.facts.get(f)?.isTest);

  const srcChanged = changed.filter((f) => /\.(tsx?|jsx?)$/.test(f));
  const suggestedChecks: string[] = [];
  if (srcChanged.length) {
    suggestedChecks.push(
      index.version === "2" ? "deno check" : `deno check ${srcChanged.join(" ")}`,
    );
  }
  suggestedChecks.push(srcChanged.length ? `deno lint ${srcChanged.join(" ")}` : "deno lint");
  const cats = new Set<string>();
  if (routes.size) cats.add("routes");
  if (islands.size) cats.add("islands");
  if (boundaryRisks.length || islands.size) cats.add("boundaries");
  if (configChanges.length) cats.add("dependencies");
  suggestedChecks.push(
    `fresh_validate(workspace, categories=[${[...cats].map((c) => `"${c}"`).join(", ")}])`,
  );
  if (relatedTests.length) suggestedChecks.push(`deno test -A ${relatedTests.join(" ")}`);
  if (index.version === "1" && (routes.size || islands.size)) {
    suggestedChecks.push("deno task manifest (if files were added/removed)");
  }

  return {
    ok: true,
    changed,
    routes: [...routes.values()],
    islands: [...islands.values()],
    wrappers: [...wrappers.values()],
    boundaryRisks,
    configChanges,
    suggestedChecks,
    relatedTests,
    affectedFiles: [...affected.entries()].map(([file, i]) => ({ file, ...i })).filter((a) =>
      a.distance > 0
    ),
  };
}

function rendersClosure(index: ProjectIndex, file: string): Set<string> {
  const out = new Set<string>();
  const queue = [file];
  const seen = new Set([file]);
  while (queue.length) {
    const cur = queue.shift()!;
    for (const e of index.graph.edges) {
      if (e.kind !== "renders" || e.to !== cur || seen.has(e.from)) continue;
      seen.add(e.from);
      out.add(e.from);
      queue.push(e.from);
    }
  }
  return out;
}

export async function gitChangedFiles(
  workspace: string,
  base: string,
  head?: string,
): Promise<string[]> {
  const args = ["diff", "--name-only", head ? `${base}...${head}` : base];
  const cmd = new Deno.Command("git", { args, cwd: workspace, stdout: "piped", stderr: "piped" });
  const out = await cmd.output();
  if (!out.success) {
    throw new Error(`git ${args.join(" ")} failed: ${new TextDecoder().decode(out.stderr).trim()}`);
  }
  return new TextDecoder().decode(out.stdout).split("\n").map((l) => l.trim()).filter(Boolean);
}
