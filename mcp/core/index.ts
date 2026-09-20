/** The per-workspace semantic index: scan → parse (incremental) → routes → graph → boundaries. */
import { isAbsolute, join, normalize } from "@std/path";
import type {
  BoundaryInfo,
  BoundaryViolation,
  ComponentEntry,
  DenoConfig,
  Detection,
  FreshDevConfig,
  FreshVersion,
  IndexStats,
  IslandEntry,
  ModuleFacts,
  ProjectGraph,
  RouteEntry,
  RouteEntry as RouteEntryT,
} from "./types.ts";
import { readDenoConfig, readFreshDevConfig } from "./config.ts";
import { detectFresh } from "./detect.ts";
import {
  exists,
  type FileStat,
  isDir,
  isSourceFile,
  readText,
  SOURCE_EXTS,
  TEST_FILE_PATTERN,
  walkFiles,
} from "./fs.ts";
import { parseModule } from "./parse.ts";
import { resolveSpecifier } from "./resolve.ts";
import { attachWrappers, buildRoutes, isColocatedIsland, parseManifest } from "./routes.ts";
import { buildGraph } from "./graph.ts";
import { computeBoundaries } from "./boundaries.ts";
import { buildIslands } from "./islands.ts";

export class IndexError extends Error {
  constructor(message: string, public hint: string | null = null) {
    super(message);
  }
}

export class ProjectIndex {
  config!: DenoConfig;
  devConfig!: FreshDevConfig;
  detection!: Detection;
  files = new Map<string, FileStat>();
  facts = new Map<string, ModuleFacts>();
  routes: RouteEntry[] = [];
  islands: IslandEntry[] = [];
  islandFiles = new Map<string, "islands-dir" | "colocated" | "external">();
  components: ComponentEntry[] = [];
  graph!: ProjectGraph;
  boundaries = new Map<string, BoundaryInfo>();
  violations: BoundaryViolation[] = [];
  assetFiles = new Set<string>();
  manifest: { routes: string[]; islands: string[] } | null = null;
  skipped: { file: string; reason: string }[] = [];
  stats: IndexStats = { files: 0, parsed: 0, reused: 0, removed: 0, ms: 0, builtAt: "" };
  clientEntries = new Set<string>();
  serverEntries = new Set<string>();

  private constructor(readonly workspace: string) {}

  get version(): FreshVersion {
    return this.detection.version ?? "2";
  }

  static async load(workspace: string, opts: { force?: boolean } = {}): Promise<ProjectIndex> {
    const idx = new ProjectIndex(workspace);
    await idx.refresh(opts.force ?? true);
    return idx;
  }

  /** Re-scan the workspace; re-parse only files whose mtime/size changed (or everything with force). */
  async refresh(force = false): Promise<IndexStats> {
    const t0 = performance.now();
    this.config = await readDenoConfig(this.workspace);
    this.devConfig = await readFreshDevConfig(this.workspace);
    this.detection = await detectFresh(this.workspace, this.config);

    const dirty = await this.consumeDirty();
    const stats = await walkFiles(this.workspace, this.workspace, {
      extensions: SOURCE_EXTS,
      ignore: this.devConfig.ignore,
    });
    const seen = new Set<string>();
    let parsed = 0;
    let reused = 0;
    this.skipped = [];
    const mapSpecifier = (spec: string) => {
      const r = resolveSpecifier(spec, "x.ts", this.config);
      return r.kind === "external" ? r.specifier : null;
    };
    const newFiles = new Map<string, FileStat>();
    for (const st of stats) {
      seen.add(st.path);
      newFiles.set(st.path, st);
      const prev = this.files.get(st.path);
      const prevFacts = this.facts.get(st.path);
      if (
        !force && prev && prevFacts && prev.mtime === st.mtime && prev.size === st.size &&
        !dirty.has(st.path)
      ) {
        reused++;
        continue;
      }
      if (st.size > this.devConfig.maxFileBytes) {
        this.skipped.push({ file: st.path, reason: `larger than maxFileBytes (${st.size})` });
        this.facts.delete(st.path);
        continue;
      }
      const text = await readText(st.abs);
      if (text === null) {
        this.skipped.push({ file: st.path, reason: "unreadable" });
        continue;
      }
      try {
        const facts = parseModule(st.path, text, { size: st.size, mtime: st.mtime }, {
          serverOnlySpecifiers: this.devConfig.serverOnlySpecifiers,
          mapSpecifier,
        });
        if (facts.parseErrors.length) {
          this.skipped.push({ file: st.path, reason: `syntax: ${facts.parseErrors[0]}` });
        }
        this.facts.set(st.path, facts);
        parsed++;
      } catch (e) {
        this.skipped.push({ file: st.path, reason: `parse failure: ${(e as Error).message}` });
        this.facts.delete(st.path);
      }
    }
    let removed = 0;
    for (const p of [...this.facts.keys()]) {
      if (!seen.has(p)) {
        this.facts.delete(p);
        removed++;
      }
    }
    this.files = newFiles;

    // assets: everything under static dirs and assets/
    this.assetFiles = new Set();
    const assetDirs = [
      ...this.detection.dirs.static,
      ...(this.detection.dirs.assets ? [this.detection.dirs.assets] : []),
    ];
    for (const d of assetDirs) {
      for (const a of await walkFiles(this.workspace, join(this.workspace, d))) {
        this.assetFiles.add(a.path);
      }
    }

    await this.rebuildDerived();
    this.stats = {
      files: this.files.size,
      parsed,
      reused,
      removed,
      ms: Math.round(performance.now() - t0),
      builtAt: new Date().toISOString(),
    };
    return this.stats;
  }

  private async consumeDirty(): Promise<Set<string>> {
    const abs = join(this.workspace, ".fresh-dev", "dirty.json");
    const out = new Set<string>();
    const text = await readText(abs);
    if (text) {
      try {
        const raw = JSON.parse(text) as { paths?: string[] };
        for (const p of raw.paths ?? []) out.add(p.replace(/^\.\//, ""));
      } catch {
        // ignore
      }
      try {
        await Deno.remove(abs);
      } catch {
        // ignore
      }
    }
    return out;
  }

  private async rebuildDerived(): Promise<void> {
    const version = this.version;
    const d = this.detection;
    const files = new Set(this.files.keys());
    const routesDir = d.dirs.routes ?? "routes";

    // ---- islands: islands/** + routes/**/(_islands)/** ----
    this.islandFiles = new Map();
    const islandsDir = d.dirs.islands;
    for (const f of files) {
      if (TEST_FILE_PATTERN.test(f) || !isSourceFile(f)) continue;
      if (islandsDir && f.startsWith(islandsDir + "/")) this.islandFiles.set(f, "islands-dir");
      else if (f.startsWith(routesDir + "/") && isColocatedIsland(f.slice(routesDir.length + 1))) {
        this.islandFiles.set(f, "colocated");
      }
    }

    // ---- routes (file system) ----
    const routeFiles = [...files].filter((f) => f.startsWith(routesDir + "/"));
    this.routes = buildRoutes({ version, routesDir, files: routeFiles, facts: this.facts });

    // ---- programmatic routes / middlewares from main.ts (2.x) ----
    if (version === "2" && d.entry.main) {
      const mf = this.facts.get(d.entry.main);
      if (mf) {
        for (const c of mf.appCalls) {
          const isRoute = ["get", "post", "patch", "put", "delete", "head", "all", "ws", "route"]
            .includes(c.method);
          if (isRoute && c.path) {
            this.routes.push({
              file: d.entry.main,
              id: `app.${c.method}(${c.path})@${d.entry.main}:${c.line}`,
              kind: "programmatic",
              pattern: c.path,
              filePattern: c.path,
              scope: "/",
              group: null,
              methods: c.method === "all" || c.method === "route"
                ? ["ALL"]
                : c.method === "ws"
                ? ["GET"]
                : [c.method.toUpperCase()],
              hasPage: false,
              hasHandler: true,
              handlerShape: c.lazy ? "unknown" : "function",
              handlerCount: c.method === "use" ? 1 : null,
              config: null,
              params: [...c.path.matchAll(/:([A-Za-z_$][\w$]*)/g)].map((m) => m[1]),
              catchAll: /\*/.test(c.path),
              optional: /\?/.test(c.path),
              layouts: [],
              middlewares: [],
              app: null,
              errorRoute: null,
              renders: [],
              islands: [],
              confidence: c.lazy ? "inferred" : "extracted",
              eager: true,
              registeredAt: { file: d.entry.main, line: c.line },
              extra: c.method === "ws" ? ["WebSocket route"] : [],
            });
          } else if (c.method === "use") {
            this.routes.push({
              file: d.entry.main,
              id: `app.use(${c.path ?? "*"})@${d.entry.main}:${c.line}`,
              kind: "middleware",
              pattern: null,
              filePattern: null,
              scope: c.path ?? "/",
              group: null,
              methods: [],
              hasPage: false,
              hasHandler: true,
              handlerShape: c.lazy ? "unknown" : "function",
              handlerCount: c.method === "use" ? 1 : null,
              config: null,
              params: [],
              catchAll: false,
              optional: false,
              layouts: [],
              middlewares: [],
              app: null,
              errorRoute: null,
              renders: [],
              islands: [],
              confidence: c.lazy ? "inferred" : "extracted",
              eager: true,
              registeredAt: { file: d.entry.main, line: c.line },
              extra: [],
            });
          } else if (c.method === "mountApp" && c.path) {
            const mounted = this.expandMountedApp(mf, c);
            if (mounted.length) {
              this.routes.push(...mounted);
              continue;
            }
            this.routes.push({
              file: d.entry.main,
              id: `app.mountApp(${c.path})`,
              kind: "programmatic",
              pattern: c.path.replace(/\/$/, "") + "/:__mounted*",
              filePattern: c.path,
              scope: c.path,
              group: null,
              methods: ["ALL"],
              hasPage: false,
              hasHandler: true,
              handlerShape: "unknown",
              handlerCount: null,
              config: null,
              params: [],
              catchAll: true,
              optional: false,
              layouts: [],
              middlewares: [],
              app: null,
              errorRoute: null,
              renders: [],
              islands: [],
              confidence: "inferred",
              eager: true,
              registeredAt: { file: d.entry.main, line: c.line },
              extra: ["mounted sub-app; its own routes are not expanded"],
            });
          }
        }
        // Programmatic middlewares guard every route registered after them (registration order);
        // file routes are registered at the fsRoutes() call. Programmatic routes never get the
        // file-system layouts/app/middlewares: their chain is snapshotted when app.get() runs.
        attachWrappers(this.routes, version);
        const fsLine = mf.appCalls.find((c) => c.method === "fsRoutes")?.line ?? Infinity;
        const progMws = this.routes.filter((r) => r.kind === "middleware" && r.registeredAt);
        const covers = (m: RouteEntryT, pattern: string | null) =>
          m.scope === "/" || pattern === m.scope ||
          (pattern ?? "").startsWith(m.scope.replace(/\/$/, "") + "/");
        const depthOf = (scope: string) =>
          scope === "/" ? 0 : scope.split("/").filter(Boolean).length;
        for (const r of this.routes) {
          if (r.kind === "middleware" || r.kind === "layout" || r.kind === "app") continue;
          const registeredLine = r.registeredAt ? r.registeredAt.line : fsLine;
          const applicable = progMws.filter((m) =>
            m.registeredAt!.line < registeredLine && covers(m, r.pattern)
          );
          if (r.registeredAt) {
            r.middlewares = applicable.map((m) => m.id);
            r.layouts = [];
            r.app = null;
            r.errorRoute = null;
            continue;
          }
          // Fresh runs middlewares segment by segment (root → leaf); inside a segment, in
          // registration order. File middlewares are registered at the fsRoutes() call.
          const entries = [
            ...applicable.map((m) => ({
              id: m.id,
              depth: depthOf(m.scope),
              line: m.registeredAt!.line,
            })),
            ...r.middlewares.map((file) => ({
              id: file,
              depth: depthOf(
                this.routes.find((x) => x.file === file && x.kind === "middleware")?.scope ?? "/",
              ),
              line: fsLine,
            })),
          ];
          entries.sort((a, b) => a.depth - b.depth || a.line - b.line);
          r.middlewares = entries.map((e) => e.id);
        }
      }
    }

    // ---- 1.x manifest ----
    this.manifest = null;
    if (version === "1" && d.entry.manifest) {
      const text = await readText(join(this.workspace, d.entry.manifest));
      if (text) this.manifest = parseManifest(text);
    }

    // ---- entries ----
    this.clientEntries = new Set(this.islandFiles.keys());
    if (d.entry.client) this.clientEntries.add(d.entry.client);
    this.serverEntries = new Set(
      this.routes.filter((r) => r.kind !== "programmatic").map((r) => r.file),
    );
    for (const e of [d.entry.main, d.entry.dev, d.entry.manifest, d.entry.config, d.entry.utils]) {
      if (e && files.has(e)) this.serverEntries.add(e);
    }

    // ---- graph & boundaries ----
    this.graph = buildGraph({
      files,
      facts: this.facts,
      config: this.config,
      routes: this.routes,
      islandFiles: new Set(this.islandFiles.keys()),
      clientEntries: this.clientEntries,
      staticDirs: d.dirs.static,
      assetFiles: this.assetFiles,
    });
    const b = computeBoundaries({
      files,
      facts: this.facts,
      graph: this.graph,
      routes: this.routes,
      clientEntries: this.clientEntries,
      serverEntries: this.serverEntries,
    });
    this.boundaries = b.boundaries;
    this.violations = b.violations;

    this.islands = buildIslands({
      version,
      islandFiles: this.islandFiles,
      islandsDir: islandsDir,
      facts: this.facts,
      graph: this.graph,
      violations: this.violations,
    });

    // ---- components ----
    this.components = [];
    for (const [id, node] of this.graph.nodes) {
      if (node.kind !== "component" || !node.file) continue;
      const fact = this.facts.get(node.file);
      const usedBy = this.graph.edges.filter((e) => e.kind === "renders" && e.to === id).map((e) =>
        e.from
      )
        .filter((v, i, a) => a.indexOf(v) === i);
      const bi = this.boundaries.get(node.file);
      this.components.push({
        file: node.file,
        exports: fact?.exports.filter((e) => e.isFunction).map((e) => e.name) ?? [],
        usedBy,
        boundary: bi?.boundary ?? "unknown",
        reachableFromIslands: (bi?.reachableFrom.length ?? 0) > 0,
      });
    }
    this.components.sort((a, b) => a.file.localeCompare(b.file));
  }

  /** `app.mountApp("/shop", shopApp)`: expand the sub-app's own `.get()/.post()` calls when it is a local import. */
  private expandMountedApp(
    mainFacts: ModuleFacts,
    call: import("./types.ts").AppCall,
  ): RouteEntry[] {
    const ident = call.argIdentifiers[0];
    if (!ident || !call.path) return [];
    const imp = mainFacts.imports.find((i) =>
      i.default === ident || i.names.some((n) => n.local === ident)
    );
    if (!imp) return [];
    const res = resolveSpecifier(imp.specifier, mainFacts.path, this.config);
    if (res.kind !== "local") return [];
    const sub = this.facts.get(res.path);
    if (!sub) return [];
    const prefix = call.path.replace(/\/$/, "");
    const out: RouteEntry[] = [];
    for (const c of sub.appCalls) {
      if (
        !["get", "post", "patch", "put", "delete", "head", "all", "ws", "route"].includes(
          c.method,
        ) || !c.path
      ) continue;
      const pattern = prefix + (c.path === "/" ? "" : c.path) || "/";
      out.push({
        file: res.path,
        id: `app.mountApp(${call.path}).${c.method}(${c.path})`,
        kind: "programmatic",
        pattern,
        filePattern: c.path,
        scope: prefix || "/",
        group: null,
        methods: c.method === "all" || c.method === "route" ? ["ALL"] : [c.method.toUpperCase()],
        hasPage: false,
        hasHandler: true,
        handlerShape: c.lazy ? "unknown" : "function",
        handlerCount: null,
        config: null,
        params: [...pattern.matchAll(/:([A-Za-z_$][\w$]*)/g)].map((m) => m[1]),
        catchAll: /\*/.test(pattern),
        optional: /\?/.test(pattern),
        layouts: [],
        middlewares: [],
        app: null,
        errorRoute: null,
        renders: [],
        islands: [],
        confidence: "inferred",
        eager: true,
        registeredAt: { file: mainFacts.path, line: call.line },
        extra: [`mounted from ${res.path}:${c.line} at ${call.path}`],
      });
    }
    return out;
  }

  routeByFile(file: string): RouteEntry | undefined {
    return this.routes.find((r) => r.file === file && r.kind !== "programmatic");
  }

  /** Files importing `file`, transitively, with the shortest chain to each. */
  importersOf(file: string, depth = 3): Map<string, string[]> {
    const out = new Map<string, string[]>();
    const queue: { file: string; chain: string[] }[] = [{ file, chain: [file] }];
    const seen = new Set([file]);
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur.chain.length - 1 >= depth) continue;
      for (const by of this.graph.importedBy.get(cur.file) ?? []) {
        if (seen.has(by)) continue;
        seen.add(by);
        const chain = [...cur.chain, by];
        out.set(by, chain);
        queue.push({ file: by, chain });
      }
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
// Manager: one server process, N workspaces
// ---------------------------------------------------------------------------

export class IndexManager {
  private indexes = new Map<string, ProjectIndex>();

  async get(workspaceArg: string, opts: { force?: boolean } = {}): Promise<ProjectIndex> {
    const workspace = await validateWorkspace(workspaceArg);
    let idx = this.indexes.get(workspace);
    if (!idx) {
      idx = await ProjectIndex.load(workspace, { force: true });
      this.indexes.set(workspace, idx);
    } else {
      await idx.refresh(opts.force ?? false);
    }
    return idx;
  }

  drop(workspace: string): void {
    this.indexes.delete(workspace);
  }
}

export async function validateWorkspace(input: string): Promise<string> {
  if (!input || typeof input !== "string") {
    throw new IndexError(
      "`workspace` is required",
      "pass the absolute path of the Fresh project root",
    );
  }
  if (!isAbsolute(input)) {
    throw new IndexError(
      `workspace must be an absolute path, got "${input}"`,
      "use the absolute project root",
    );
  }
  const ws = normalize(input).replace(/[\\/]+$/, "") || "/";
  if (ws === "/" || /^[A-Za-z]:$/.test(ws)) {
    throw new IndexError("refusing to index the filesystem root", "pass a project directory");
  }
  if (!(await isDir(ws))) {
    throw new IndexError(`workspace does not exist or is not a directory: ${ws}`);
  }
  const hasConfig = (await exists(join(ws, "deno.json"))) || (await exists(join(ws, "deno.jsonc")));
  if (!hasConfig) {
    throw new IndexError(
      `no deno.json/deno.jsonc in ${ws}`,
      "fresh-dev only indexes a Deno project root; for a monorepo pass the app directory",
    );
  }
  return ws;
}
