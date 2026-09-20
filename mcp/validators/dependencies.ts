import type { Finding } from "../core/types.ts";
import { finding, inScope, type Rule } from "./rule.ts";

export const dependencyRules: Rule[] = [
  {
    id: "D001",
    category: "dependencies",
    severity: "error",
    versions: ["1", "2"],
    title: "import of a missing local file",
    run(ctx) {
      const out: Finding[] = [];
      for (const u of ctx.index.graph.unresolved) {
        if (!u.reason.startsWith("file not found") || !inScope(ctx, u.file)) continue;
        out.push(
          finding(
            this,
            u.file,
            `import "${u.specifier}" → ${
              u.reason.replace("file not found: ", "")
            } does not exist (paths are case-sensitive and need the extension)`,
            { line: u.line },
          ),
        );
      }
      return out;
    },
  },
  {
    id: "D002",
    category: "dependencies",
    severity: "error",
    versions: ["1", "2"],
    title: "bare specifier not in the import map",
    run(ctx) {
      const out: Finding[] = [];
      for (const u of ctx.index.graph.unresolved) {
        if (!u.reason.startsWith("bare specifier") || !inScope(ctx, u.file)) continue;
        out.push(
          finding(
            this,
            u.file,
            `"${u.specifier}" is neither relative, jsr:/npm:/https:/node:, nor a key of deno.json "imports"`,
            { line: u.line, hint: "add it to deno.json imports or use a full specifier" },
          ),
        );
      }
      return out;
    },
  },
  {
    id: "D003",
    category: "dependencies",
    severity: "error",
    versions: ["1", "2"],
    title: "Fresh 1.x and 2.x mixed",
    run(ctx) {
      const cfg = ctx.index.config;
      const file = cfg.path ?? "deno.json";
      if (!inScope(ctx, file)) return [];
      const has1 = !!cfg.imports["$fresh/"];
      const has2 = !!(cfg.imports["fresh"] ?? cfg.imports["@fresh/core"]);
      if (has1 && has2) {
        return [
          finding(
            this,
            file,
            'deno.json maps both "$fresh/" (1.x) and "fresh" (2.x); pick one version',
            { hint: "run `deno run -A -r jsr:@fresh/update .` to finish a migration" },
          ),
        ];
      }
      const usesBoth =
        [...ctx.index.facts.values()].some((f) =>
          f.imports.some((i) => i.specifier.startsWith("$fresh/"))
        ) &&
        [...ctx.index.facts.values()].some((f) =>
          f.imports.some((i) => i.specifier === "fresh" || i.specifier.startsWith("fresh/"))
        );
      return usesBoth
        ? [
          finding(
            this,
            file,
            'some modules import from "$fresh/…" (1.x) and others from "fresh" (2.x)',
            { confidence: "inferred" },
          ),
        ]
        : [];
    },
  },
  {
    id: "D004",
    category: "dependencies",
    severity: "error",
    versions: ["1", "2"],
    title: "JSX compiler options",
    run(ctx) {
      const cfg = ctx.index.config;
      const file = cfg.path ?? "deno.json";
      if (!inScope(ctx, file)) return [];
      const co = cfg.compilerOptions;
      const out: Finding[] = [];
      if (co.jsxImportSource !== "preact") {
        out.push(
          finding(
            this,
            file,
            `compilerOptions.jsxImportSource must be "preact" (found ${
              JSON.stringify(co.jsxImportSource ?? null)
            })`,
          ),
        );
      }
      if (co.jsx !== "react-jsx" && co.jsx !== "precompile") {
        out.push(
          finding(
            this,
            file,
            `compilerOptions.jsx must be "react-jsx" (1.x) or "precompile" (2.x); found ${
              JSON.stringify(co.jsx ?? null)
            }`,
          ),
        );
      }
      return out;
    },
  },
  {
    id: "D005",
    category: "dependencies",
    severity: "warning",
    versions: ["1", "2"],
    title: "duplicate preact versions",
    run(ctx) {
      const cfg = ctx.index.config;
      const file = cfg.path ?? "deno.json";
      if (!inScope(ctx, file)) return [];
      const out: Finding[] = [];
      const ver = (s: string | undefined) => s?.match(/preact@([~^]?[\d.]+)/)?.[1] ?? null;
      const a = ver(cfg.imports["preact"]);
      const b = ver(cfg.imports["preact/"]);
      if (a && b && a !== b) {
        out.push(
          finding(
            this,
            file,
            `"preact" is pinned to ${a} but "preact/" to ${b}; two copies of preact break hooks and signals`,
          ),
        );
      }
      const src = (s: string | undefined) =>
        s?.startsWith("npm:") ? "npm" : s?.includes("esm.sh") ? "esm.sh" : null;
      const sa = src(cfg.imports["preact"]);
      const sb = src(cfg.imports["@preact/signals"]);
      if (sa && sb && sa !== sb) {
        out.push(
          finding(
            this,
            file,
            `preact comes from ${sa} but @preact/signals from ${sb}; mixing registries can load preact twice`,
          ),
        );
      }
      return out;
    },
  },
  {
    id: "D006",
    category: "dependencies",
    severity: "warning",
    versions: ["1", "2"],
    title: "import cycle touching routes/ or islands/",
    run(ctx) {
      const out: Finding[] = [];
      const idx = ctx.index;
      const starts = [
        ...idx.routes.filter((r) => r.kind !== "programmatic").map((r) => r.file),
        ...idx.islandFiles.keys(),
      ];
      const reported = new Set<string>();
      for (const start of starts) {
        const stack: string[] = [];
        const onStack = new Set<string>();
        const done = new Set<string>();
        const dfs = (f: string): string[] | null => {
          stack.push(f);
          onStack.add(f);
          for (const e of idx.graph.importsOf.get(f) ?? []) {
            if (onStack.has(e.target)) return [...stack.slice(stack.indexOf(e.target)), e.target];
            if (done.has(e.target)) continue;
            const c = dfs(e.target);
            if (c) return c;
          }
          stack.pop();
          onStack.delete(f);
          done.add(f);
          return null;
        };
        const cycle = dfs(start);
        if (cycle && inScope(ctx, cycle[0]) && !reported.has(cycle.slice().sort().join("|"))) {
          reported.add(cycle.slice().sort().join("|"));
          out.push(
            finding(this, cycle[0], `import cycle: ${cycle.join(" → ")}`, {
              confidence: "inferred",
            }),
          );
        }
        if (out.length >= 20) break;
      }
      return out;
    },
  },
  {
    id: "D007",
    category: "dependencies",
    severity: "info",
    versions: ["1"],
    title: "npm: dependency in an island without nodeModulesDir",
    run(ctx) {
      const out: Finding[] = [];
      if (ctx.index.config.nodeModulesDir) return out;
      for (const file of ctx.index.islandFiles.keys()) {
        if (!inScope(ctx, file)) continue;
        const ext = ctx.index.graph.externalsOf.get(file) ?? [];
        const npm = ext.find((e) => e.scheme === "npm");
        if (npm) {
          out.push(
            finding(
              this,
              file,
              `island imports ${npm.specifier}; Fresh 1 bundles npm packages more reliably with "nodeModulesDir": true in deno.json`,
              { line: npm.line },
            ),
          );
        }
      }
      return out;
    },
  },
];
