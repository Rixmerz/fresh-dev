/** MCP tool surface (plan §4.6). Thin handlers over core/; every tool requires `workspace`. */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { IndexError, IndexManager, type ProjectIndex } from "../core/index.ts";
import { traceRequest } from "../core/trace.ts";
import { computeImpact, gitChangedFiles } from "../core/impact.ts";
import { exportGraph } from "../core/export.ts";
import { validate } from "../validators/index.ts";
import type { Category, RouteEntry } from "../core/types.ts";
import { VERSION } from "../version.ts";

export const manager = new IndexManager();

const workspaceArg = z.string().describe(
  "Absolute path of the Fresh project root (the directory holding deno.json). Required on every call; there is no cwd fallback.",
);

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

function ok(payload: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 1) }] };
}

function fail(e: unknown): ToolResult {
  const err = e as Error & { hint?: string | null };
  const body = {
    ok: false,
    error: err.message ?? String(e),
    hint: err instanceof IndexError ? err.hint : null,
  };
  return { content: [{ type: "text", text: JSON.stringify(body) }], isError: true };
}

function page<T>(items: T[], limit: number, offset: number) {
  const slice = items.slice(offset, offset + limit);
  return {
    items: slice,
    total: items.length,
    offset,
    limit,
    truncated: offset + limit < items.length,
    next_offset: offset + limit < items.length ? offset + limit : null,
  };
}

let denoVersionCache: string | null | undefined;
async function denoVersion(): Promise<string | null> {
  if (denoVersionCache !== undefined) return denoVersionCache;
  try {
    const out = await new Deno.Command("deno", {
      args: ["--version"],
      stdout: "piped",
      stderr: "null",
    }).output();
    denoVersionCache = new TextDecoder().decode(out.stdout).split("\n")[0]?.trim() ?? null;
  } catch {
    denoVersionCache = null;
  }
  return denoVersionCache;
}

function routeSummary(r: RouteEntry) {
  return {
    pattern: r.pattern,
    kind: r.kind,
    file: r.file,
    methods: r.methods,
    group: r.group,
    scope: r.kind === "middleware" || r.kind === "layout" ? r.scope : undefined,
  };
}

function routeFull(r: RouteEntry) {
  return {
    ...routeSummary(r),
    id: r.id,
    hasPage: r.hasPage,
    hasHandler: r.hasHandler,
    handlerShape: r.handlerShape,
    config: r.config,
    params: r.params,
    catchAll: r.catchAll,
    optional: r.optional,
    app: r.app,
    layouts: r.layouts,
    middlewares: r.middlewares,
    errorRoute: r.errorRoute,
    renders: r.renders,
    islands: r.islands,
    confidence: r.confidence,
    registeredAt: r.registeredAt,
    notes: r.extra,
  };
}

export async function projectSummary(idx: ProjectIndex) {
  const d = idx.detection;
  const routes = idx.routes.filter((r) => r.kind !== "programmatic");
  return {
    ok: true,
    workspace: idx.workspace,
    isFresh: d.isFresh,
    version: d.version,
    flavor: d.flavor,
    freshVersion: d.freshVersion,
    freshSpecifier: d.freshSpecifier,
    preact: d.preactSpecifier,
    confidence: d.confidence,
    evidence: d.evidence,
    dirs: d.dirs,
    entry: d.entry,
    apps: d.apps,
    counts: {
      files: idx.files.size,
      routes:
        routes.filter((r) => r.kind === "page" || r.kind === "api" || r.kind === "page+handler")
          .length,
      programmaticRoutes: idx.routes.filter((r) => r.kind === "programmatic").length,
      layouts: routes.filter((r) => r.kind === "layout").length,
      middlewares: routes.filter((r) => r.kind === "middleware").length +
        idx.routes.filter((r) => r.kind === "middleware" && r.registeredAt).length,
      errorRoutes: routes.filter((r) => r.kind === "error" || r.kind === "notFound").length,
      islands: idx.islands.filter((i) => i.exportName !== "(none)").length,
      islandFiles: idx.islandFiles.size,
      components: idx.components.length,
      boundaryViolations: idx.violations.length,
      unresolvedImports: idx.graph.unresolved.length,
    },
    tasks: idx.config.tasks,
    lintTags: idx.config.lintTags,
    deno: await denoVersion(),
    index: idx.stats,
    skipped: idx.skipped,
    manifest: idx.manifest
      ? { routes: idx.manifest.routes.length, islands: idx.manifest.islands.length }
      : null,
    pluginVersion: VERSION,
  };
}

export function registerTools(server: McpServer): void {
  server.registerTool("fresh_project", {
    title: "Detect and summarise a Fresh project",
    description:
      "Detects whether `workspace` is a Deno Fresh project (1.x or 2.x, Vite or builder flavor), returns the entry files, directories, counts of routes/islands/components/middlewares, Deno workspace members that are Fresh apps, and the index status. Call this first.",
    inputSchema: { workspace: workspaceArg },
  }, async ({ workspace }: { workspace: string }) => {
    try {
      const idx = await manager.get(workspace);
      return ok(await projectSummary(idx));
    } catch (e) {
      return fail(e);
    }
  });

  server.registerTool(
    "fresh_routes",
    {
      title: "List routes",
      description:
        "The route table: URL pattern, kind (page | api | page+handler | middleware | layout | app | error | notFound | programmatic), HTTP methods, route group, and per route the layouts, middlewares and islands that apply. Filter by kind or URL prefix; use summary_only on large sites.",
      inputSchema: {
        workspace: workspaceArg,
        kind: z.enum(["page", "api", "middleware", "layout", "special", "programmatic"]).optional()
          .describe(
            "page = page and page+handler; api; middleware; layout; special = app/error/notFound; programmatic = app.get()/app.use() in main.ts",
          ),
        prefix: z.string().optional().describe(
          "Only routes whose pattern starts with this prefix, e.g. /blog",
        ),
        summary_only: z.boolean().optional().default(false),
        limit: z.number().int().min(1).max(500).optional().default(100),
        offset: z.number().int().min(0).optional().default(0),
      },
    },
    async (
      { workspace, kind, prefix, summary_only, limit, offset }: {
        workspace: string;
        kind?: string;
        prefix?: string;
        summary_only?: boolean;
        limit?: number;
        offset?: number;
      },
    ) => {
      limit = limit ?? 100;
      offset = offset ?? 0;
      try {
        const idx = await manager.get(workspace);
        let routes = idx.routes;
        if (kind === "page") {
          routes = routes.filter((r) => r.kind === "page" || r.kind === "page+handler");
        } else if (kind === "api") routes = routes.filter((r) => r.kind === "api");
        else if (kind === "middleware") routes = routes.filter((r) => r.kind === "middleware");
        else if (kind === "layout") routes = routes.filter((r) => r.kind === "layout");
        else if (kind === "special") {
          routes = routes.filter((r) =>
            r.kind === "app" || r.kind === "error" || r.kind === "notFound"
          );
        } else if (kind === "programmatic") {
          routes = routes.filter((r) => r.kind === "programmatic");
        }
        if (prefix) routes = routes.filter((r) => (r.pattern ?? r.scope).startsWith(prefix));
        const p = page(routes.map(summary_only ? routeSummary : routeFull), limit, offset);
        return ok({
          ok: true,
          version: idx.version,
          routes: p.items,
          total: p.total,
          offset: p.offset,
          truncated: p.truncated,
          next_offset: p.next_offset,
        });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "fresh_route",
    {
      title: "Inspect one route",
      description:
        "Everything about one route (by URL pattern or by file): the request chain app → middlewares → layouts → handler → page, data passed from handler to page, components rendered, islands hydrated, imports (local and external), server/client boundary of the file, and test files that import it.",
      inputSchema: {
        workspace: workspaceArg,
        pattern: z.string().optional().describe(
          "URL pattern as listed by fresh_routes, e.g. /blog/:slug",
        ),
        file: z.string().optional().describe(
          "Workspace-relative route file, e.g. routes/blog/[slug].tsx",
        ),
      },
    },
    async (
      { workspace, pattern, file }: { workspace: string; pattern?: string; file?: string },
    ) => {
      try {
        const idx = await manager.get(workspace);
        const r = idx.routes.find((x) =>
          (file && x.file === file.replace(/^\.\//, "") && x.kind !== "programmatic") ||
          (pattern && x.pattern === pattern)
        );
        if (!r) {
          return ok({
            ok: false,
            error: "route not found",
            hint: "use fresh_routes to list patterns and files",
            did_you_mean: idx.routes.filter((x) =>
              x.pattern && pattern && x.pattern.includes(pattern.replace(/^\//, ""))
            ).slice(0, 5).map((x) => x.pattern),
          });
        }
        const f = idx.facts.get(r.file);
        const chain = [
          ...(r.app ? [{ step: "app", file: r.app }] : []),
          ...r.middlewares.map((m) => ({ step: "middleware", file: m })),
          ...r.layouts.map((l) => ({ step: "layout", file: l })),
          ...(r.hasHandler ? [{ step: "handler", file: r.file, methods: r.methods }] : []),
          ...(r.hasPage ? [{ step: "page", file: r.file }] : []),
        ];
        const def = f?.exports.find((e) => e.isDefault);
        const tests = (idx.graph.importedBy.get(r.file) ?? []).filter((x) =>
          idx.facts.get(x)?.isTest
        );
        return ok({
          ok: true,
          route: routeFull(r),
          chain,
          passesData: f?.handler && r.hasPage
            ? {
              handler: f.handler.exportName,
              methods: f.handler.methods,
              renderCalls: f.renderCalls,
              pageProps: def?.props?.typeName ?? null,
            }
            : null,
          exports: f?.exports.map((e) => ({
            name: e.name,
            kind: e.kind,
            isFunction: e.isFunction,
            line: e.line,
            wrapper: e.defineWrapper,
          })) ?? [],
          imports: {
            local: (idx.graph.importsOf.get(r.file) ?? []).map((i) => ({
              file: i.target,
              line: i.line,
              dynamic: i.dynamic,
            })),
            external: idx.graph.externalsOf.get(r.file) ?? [],
            unresolved: idx.graph.unresolved.filter((u) => u.file === r.file),
          },
          boundary: idx.boundaries.get(r.file) ?? null,
          css: f?.cssExport ?? null,
          tests,
          lines: f?.lineCount ?? null,
        });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "fresh_islands",
    {
      title: "List islands",
      description:
        "Islands (islands/**, routes/**/(_islands)/**): file, registered name and export, props with serialisability verdict per Fresh version, which routes/components render them, the client bundle closure (local modules pulled into the browser), and boundary violations (server-only code reachable from the island).",
      inputSchema: {
        workspace: workspaceArg,
        name: z.string().optional().describe("Island name, export name or file substring"),
        summary_only: z.boolean().optional().default(false),
      },
    },
    async (
      { workspace, name, summary_only }: {
        workspace: string;
        name?: string;
        summary_only?: boolean;
      },
    ) => {
      try {
        const idx = await manager.get(workspace);
        let islands = idx.islands;
        if (name) {
          const n = name.toLowerCase();
          islands = islands.filter((i) =>
            i.name.toLowerCase() === n || i.exportName.toLowerCase() === n ||
            i.file.toLowerCase().includes(n)
          );
        }
        const items = islands.map((i) =>
          summary_only
            ? {
              file: i.file,
              name: i.name,
              exportName: i.exportName,
              usedBy: i.usedBy.length,
              violations: i.violations.length,
            }
            : {
              ...i,
              clientClosure: i.clientClosure.length > 40
                ? [...i.clientClosure.slice(0, 40), `… ${i.clientClosure.length - 40} more`]
                : i.clientClosure,
            }
        );
        return ok({ ok: true, version: idx.version, islands: items, total: items.length });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool("fresh_components", {
    title: "List components",
    description:
      "Server-rendered components: file, exported components, who renders them, boundary (server | shared | client | unknown) and whether they are reachable from islands (then they are part of a client bundle).",
    inputSchema: {
      workspace: workspaceArg,
      name: z.string().optional().describe("Export name or file substring"),
      only: z.enum(["server", "client", "shared", "unknown"]).optional(),
    },
  }, async ({ workspace, name, only }: { workspace: string; name?: string; only?: string }) => {
    try {
      const idx = await manager.get(workspace);
      let comps = idx.components;
      if (name) {
        const n = name.toLowerCase();
        comps = comps.filter((c) =>
          c.file.toLowerCase().includes(n) || c.exports.some((e) => e.toLowerCase() === n)
        );
      }
      if (only) comps = comps.filter((c) => c.boundary === only);
      return ok({
        ok: true,
        components: comps,
        total: comps.length,
        unused: comps.filter((c) => c.usedBy.length === 0).map((c) => c.file),
      });
    } catch (e) {
      return fail(e);
    }
  });

  server.registerTool(
    "fresh_dependencies",
    {
      title: "Import graph slice",
      description:
        "Resolved imports (import map applied) of a file, or the files importing it, up to `depth` hops, with external dependencies (jsr:/npm:/https:/node:) and unresolved specifiers.",
      inputSchema: {
        workspace: workspaceArg,
        file: z.string().describe("Workspace-relative file"),
        direction: z.enum(["imports", "importers"]).optional().default("imports"),
        depth: z.number().int().min(1).max(10).optional().default(1),
        include_external: z.boolean().optional().default(true),
      },
    },
    async (
      { workspace, file, direction, depth, include_external }: {
        workspace: string;
        file: string;
        direction?: "imports" | "importers";
        depth?: number;
        include_external?: boolean;
      },
    ) => {
      direction = direction ?? "imports";
      depth = depth ?? 1;
      include_external = include_external ?? true;
      try {
        const idx = await manager.get(workspace);
        const start = file.replace(/^\.\//, "");
        if (!idx.files.has(start)) {
          return ok({
            ok: false,
            error: `file not indexed: ${start}`,
            hint: "paths are workspace-relative; only .ts/.tsx/.js/.jsx are indexed",
          });
        }
        const levels: { file: string; distance: number; via: string }[] = [];
        const seen = new Set([start]);
        let frontier = [start];
        for (let d = 1; d <= depth && frontier.length; d++) {
          const next: string[] = [];
          for (const f of frontier) {
            const edges = direction === "imports"
              ? (idx.graph.importsOf.get(f) ?? []).map((e) => e.target)
              : (idx.graph.importedBy.get(f) ?? []);
            for (const t of edges) {
              if (seen.has(t)) continue;
              seen.add(t);
              levels.push({ file: t, distance: d, via: f });
              next.push(t);
            }
          }
          frontier = next;
        }
        const externals = include_external
          ? [...seen].flatMap((f) =>
            (idx.graph.externalsOf.get(f) ?? []).map((e) => ({ from: f, ...e }))
          )
          : [];
        return ok({
          ok: true,
          file: start,
          direction,
          boundary: idx.boundaries.get(start)?.boundary ?? null,
          files: levels,
          external: externals,
          unresolved: idx.graph.unresolved.filter((u) => seen.has(u.file)),
        });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool("fresh_usages", {
    title: "Where is this used",
    description:
      "Where a file or an exported symbol (`file::Export`) is used: import sites (file, line) and JSX render sites, including islands hydrated through it. Complements the LSP's findReferences, which does not follow aliased JSX usage or re-exports.",
    inputSchema: {
      workspace: workspaceArg,
      target: z.string().describe(
        "`components/Hero.tsx` or `components/Hero.tsx::Hero` (default export = `::default`)",
      ),
    },
  }, async ({ workspace, target }: { workspace: string; target: string }) => {
    try {
      const idx = await manager.get(workspace);
      const [file, exportName] = target.replace(/^\.\//, "").split("::");
      if (!idx.files.has(file)) return ok({ ok: false, error: `file not indexed: ${file}` });
      const imports = [...idx.graph.importedBy.get(file) ?? []].flatMap((by) =>
        (idx.facts.get(by)?.imports ?? []).map((imp) => ({ by, imp })).filter(({ imp }) => {
          const r = imp.specifier.startsWith(".") || imp.specifier.startsWith("@/") ||
            imp.specifier.startsWith("$");
          return r &&
            (idx.graph.importsOf.get(by) ?? []).some((e) =>
              e.target === file && e.line === imp.line
            );
        }).map(({ by, imp }) => ({
          file: by,
          line: imp.line,
          names: [
            ...(imp.default ? ["default as " + imp.default] : []),
            ...imp.names.map((n) =>
              n.imported === n.local ? n.imported : `${n.imported} as ${n.local}`
            ),
            ...(imp.namespace ? ["* as " + imp.namespace] : []),
          ],
          dynamic: imp.dynamic,
          reexport: imp.reexport,
        })).filter((u) =>
          !exportName ||
          u.names.some((n) => n.startsWith(exportName === "default" ? "default" : exportName))
        )
      );
      const jsxUses = idx.graph.edges.filter((e) =>
        e.kind === "renders" && e.to === file &&
        (!exportName || (e.detail ?? "default").split(" ")[0] === exportName)
      ).map((e) => ({
        file: e.from,
        line: e.line,
        export: (e.detail ?? "default").split(" ")[0],
        confidence: e.confidence,
      }));
      const routes = idx.routes.filter((r) => r.renders.includes(file) || r.islands.includes(file))
        .map((r) => ({
          pattern: r.pattern,
          file: r.file,
          how: r.islands.includes(file) ? "hydrates" : "renders",
        }));
      return ok({
        ok: true,
        target,
        imports,
        jsxUses,
        routes,
        unused: imports.length === 0 && jsxUses.length === 0,
      });
    } catch (e) {
      return fail(e);
    }
  });

  server.registerTool(
    "fresh_impact",
    {
      title: "Impact of a change",
      description:
        "Given changed files (or a git base ref), which routes, islands, layouts and middlewares are affected and why, boundary risks, config-level changes, tests that import the changed files, and the checks to run next (deno check, deno lint, fresh_validate categories).",
      inputSchema: {
        workspace: workspaceArg,
        files: z.array(z.string()).optional().describe("Workspace-relative changed files"),
        git: z.object({ base: z.string(), head: z.string().optional() }).optional().describe(
          "Use `git diff --name-only base[...head]` to obtain the changed files",
        ),
        depth: z.number().int().min(1).max(10).optional().default(3),
      },
    },
    async (
      { workspace, files, git, depth }: {
        workspace: string;
        files?: string[];
        git?: { base: string; head?: string };
        depth?: number;
      },
    ) => {
      try {
        const idx = await manager.get(workspace);
        let changed = files ?? [];
        if (git) {
          changed = [
            ...changed,
            ...(await gitChangedFiles(idx.workspace, git.base, git.head)),
          ];
        }
        if (changed.length === 0) {
          return ok({
            ok: false,
            error: "no changed files",
            hint: "pass files[] or git: {base}",
          });
        }
        return ok(computeImpact(idx, changed, depth ?? 3));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool("fresh_trace", {
    title: "Trace a request",
    description:
      "Which route serves a URL path and with what chain (app wrapper, middlewares in order, layouts outer→inner, handler, page), the islands hydrated, params, whether a static file would be served first, and which 404/error route applies when nothing matches.",
    inputSchema: {
      workspace: workspaceArg,
      path: z.string().describe("URL path, e.g. /blog/hello?x=1"),
      method: z.string().optional().default("GET"),
    },
  }, async ({ workspace, path, method }: { workspace: string; path: string; method?: string }) => {
    try {
      const idx = await manager.get(workspace);
      const t = await traceRequest(idx, path, method ?? "GET");
      return ok({
        ...t,
        matched: t.matched
          ? {
            route: routeFull(t.matched.route),
            params: t.matched.params,
            methodAllowed: t.matched.methodAllowed,
          }
          : null,
      });
    } catch (e) {
      return fail(e);
    }
  });

  server.registerTool("fresh_boundaries", {
    title: "Server/client boundaries",
    description:
      "Classification of every module (client-entry | client | shared | server | unknown) with the server-only and browser-only signals found, and the violations: server code reachable from an island (with the import chain) or browser globals in server code.",
    inputSchema: { workspace: workspaceArg, only_violations: z.boolean().optional().default(true) },
  }, async ({ workspace, only_violations }: { workspace: string; only_violations?: boolean }) => {
    only_violations = only_violations ?? true;
    try {
      const idx = await manager.get(workspace);
      const modules = only_violations ? [] : [...idx.boundaries.values()].map((b) => ({
        file: b.file,
        boundary: b.boundary,
        serverSignals: b.serverSignals.map((s) => s.detail),
        browserSignals: b.browserSignals.map((s) => s.detail),
        reachableFrom: b.reachableFrom,
      }));
      const counts: Record<string, number> = {};
      for (const b of idx.boundaries.values()) counts[b.boundary] = (counts[b.boundary] ?? 0) + 1;
      return ok({
        ok: true,
        counts,
        clientEntries: [...idx.clientEntries],
        violations: idx.violations,
        modules,
      });
    } catch (e) {
      return fail(e);
    }
  });

  server.registerTool(
    "fresh_validate",
    {
      title: "Validate Fresh structure",
      description:
        "Runs the fresh-dev rule catalogue (routes R*, islands I*, boundaries B*, dependencies D*, conventions C*) and optionally merges `deno lint` (fresh tag) and `deno check`. Returns ok=false when any error-severity finding exists. Files that could not be parsed are listed under summary.unverified, never silently skipped.",
      inputSchema: {
        workspace: workspaceArg,
        categories: z.array(
          z.enum(["routes", "islands", "boundaries", "dependencies", "conventions"]),
        ).optional(),
        files: z.array(z.string()).optional().describe("Restrict findings to these files"),
        external: z.object({
          deno_lint: z.boolean().optional(),
          deno_check: z.boolean().optional(),
        }).optional(),
      },
    },
    async (
      { workspace, categories, files, external }: {
        workspace: string;
        categories?: string[];
        files?: string[];
        external?: { deno_lint?: boolean; deno_check?: boolean };
      },
    ) => {
      try {
        const idx = await manager.get(workspace);
        const r = await validate(idx, {
          categories: categories as Category[] | undefined,
          files,
          external: { denoLint: external?.deno_lint, denoCheck: external?.deno_check },
        });
        return ok(r);
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "fresh_graph_export",
    {
      title: "Export graph for LiveSpec",
      description:
        "Writes a Graphify-compatible node-link graph.json (default .fresh-dev/graph.json) with Fresh render/hydrate/wrap/guard edges as uses_component/uses relations, for livespec's ingest_external_graph. Returns counts and the .livespec.toml snippet. This is the only tool that writes, and only under .fresh-dev/.",
      inputSchema: {
        workspace: workspaceArg,
        path: z.string().optional().describe(
          "Workspace-relative output path (default .fresh-dev/graph.json)",
        ),
        relations: z.array(z.string()).optional().describe(
          "Subset of relations to emit: uses_component, uses, imports",
        ),
      },
    },
    async (
      { workspace, path, relations }: { workspace: string; path?: string; relations?: string[] },
    ) => {
      try {
        const idx = await manager.get(workspace);
        if (path && (path.startsWith("/") || path.includes(".."))) {
          return ok({
            ok: false,
            error: "path must be workspace-relative and inside the workspace",
          });
        }
        return ok(await exportGraph(idx, { path, relations }));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool("fresh_reindex", {
    title: "Rebuild the index",
    description:
      "Re-scan the workspace. Without force only files whose mtime/size changed are re-parsed. Hooks call this after edits; you rarely need it because every tool refreshes lazily.",
    inputSchema: { workspace: workspaceArg, force: z.boolean().optional().default(false) },
  }, async ({ workspace, force }: { workspace: string; force?: boolean }) => {
    try {
      const idx = await manager.get(workspace, { force: force ?? false });
      return ok({ ok: true, ...idx.stats, skipped: idx.skipped });
    } catch (e) {
      return fail(e);
    }
  });
}
