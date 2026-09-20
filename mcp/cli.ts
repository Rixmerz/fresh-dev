#!/usr/bin/env -S deno run --allow-read --allow-env --allow-run=deno,git --allow-write
/**
 * Headless CLI sharing the MCP core: `fresh-mcp <command> <workspace> [flags]`.
 * Exit codes for `validate`: 0 ok, 1 error-severity findings, 2 not a Fresh project, 3 internal error.
 */
import { IndexError, ProjectIndex } from "./core/index.ts";
import { catalogue, validate } from "./validators/index.ts";
import { traceRequest } from "./core/trace.ts";
import { computeImpact, gitChangedFiles } from "./core/impact.ts";
import { exportGraph } from "./core/export.ts";
import { projectSummary } from "./tools/index.ts";
import { validateWorkspace } from "./core/index.ts";
import type { Category } from "./core/types.ts";
import { VERSION } from "./version.ts";
import { resolve } from "@std/path";

const USAGE = `fresh-mcp ${VERSION} — Fresh (Deno) semantic analysis CLI

usage: fresh-mcp <command> <workspace> [flags]

commands
  project      detect + counts
  routes       route table            [--kind k] [--prefix p]
  route        one route              --pattern p | --file f
  islands      islands                [--name n]
  components   components             [--name n]
  deps         imports of a file      --file f [--importers] [--depth n]
  usages       usages of a file       --file f[::Export]
  impact       impact of a change     --file f ... | --base <git-ref> [--head <ref>]
  trace        request chain          --path /url [--method GET]
  boundaries   server/client map      [--all]
  validate     rule catalogue         [--category c ...] [--file f ...] [--deno-lint] [--deno-check] [--fast]
  export       LiveSpec graph.json    [--path p]
  reindex      rebuild index          [--force]
  rules        list the rule catalogue

flags: --json (machine output)`;

function parseArgs(argv: string[]) {
  const flags: Record<string, string[] | boolean> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        const list = (flags[key] as string[] | undefined) ?? [];
        if (Array.isArray(list)) list.push(next);
        flags[key] = list;
        i++;
      } else flags[key] = true;
    } else positional.push(a);
  }
  return { flags, positional };
}

function str(flags: Record<string, string[] | boolean>, k: string): string | undefined {
  const v = flags[k];
  return Array.isArray(v) ? v[0] : undefined;
}
function list(flags: Record<string, string[] | boolean>, k: string): string[] {
  const v = flags[k];
  return Array.isArray(v) ? v : [];
}

async function main(): Promise<number> {
  const { flags, positional } = parseArgs(Deno.args);
  const [command, wsArg] = positional;
  if (!command || command === "help" || flags.help) {
    console.log(USAGE);
    return 0;
  }
  if (command === "rules") {
    const rules = catalogue();
    if (flags.json) console.log(JSON.stringify(rules, null, 1));
    else {for (const r of rules) {
        console.log(
          `${r.id}  ${r.severity.padEnd(7)} ${r.category.padEnd(12)} [${
            r.versions.join(",")
          }]  ${r.title}`,
        );
      }}
    return 0;
  }
  const ws = resolve(wsArg ?? Deno.cwd());
  const json = !!flags.json;
  let idx: ProjectIndex;
  try {
    const validated = await validateWorkspace(ws);
    idx = await ProjectIndex.load(validated, { force: !!flags.force });
  } catch (e) {
    const err = e as IndexError;
    if (json) {
      console.log(JSON.stringify({ ok: false, error: err.message, hint: err.hint ?? null }));
    } else console.error(`error: ${err.message}${err.hint ? `\nhint: ${err.hint}` : ""}`);
    return 2;
  }
  if (!idx.detection.isFresh && command !== "project") {
    const msg = {
      ok: false,
      error: `${idx.workspace} is not a Fresh project`,
      evidence: idx.detection.evidence,
    };
    if (json) console.log(JSON.stringify(msg));
    else console.error(`error: ${msg.error}`);
    return 2;
  }
  const out = (payload: unknown, human: () => void) => {
    if (json) console.log(JSON.stringify(payload, null, 1));
    else human();
  };
  switch (command) {
    case "project": {
      const s = await projectSummary(idx);
      out(s, () => {
        console.log(
          `${s.isFresh ? "Fresh" : "not Fresh"} ${s.version ?? ""} (${s.flavor}) ${
            s.freshVersion ?? ""
          }`.trim(),
        );
        console.log(
          `routes ${s.counts.routes} (+${s.counts.programmaticRoutes} programmatic)  layouts ${s.counts.layouts}  middlewares ${s.counts.middlewares}  islands ${s.counts.islands}  components ${s.counts.components}`,
        );
        console.log(
          `boundary violations ${s.counts.boundaryViolations}  unresolved imports ${s.counts.unresolvedImports}  index ${s.index.ms}ms`,
        );
        for (const e of s.evidence) console.log(`  - ${e}`);
      });
      return s.isFresh ? 0 : 2;
    }
    case "routes": {
      let routes = idx.routes;
      const kind = str(flags, "kind");
      const prefix = str(flags, "prefix");
      if (kind) {
        routes = routes.filter((r) =>
          r.kind === kind || (kind === "page" && r.kind === "page+handler")
        );
      }
      if (prefix) routes = routes.filter((r) => (r.pattern ?? r.scope).startsWith(prefix));
      out({ ok: true, routes }, () => {
        for (const r of routes) {
          console.log(
            `${(r.pattern ?? "-").padEnd(32)} ${r.kind.padEnd(13)} ${r.file}  [${
              r.methods.join(",")
            }]  L${r.layouts.length} M${r.middlewares.length} I${r.islands.length}`,
          );
        }
      });
      return 0;
    }
    case "route": {
      const pattern = str(flags, "pattern");
      const file = str(flags, "file");
      const r = idx.routes.find((x) =>
        (file && x.file === file) || (pattern && x.pattern === pattern)
      );
      if (!r) {
        out({ ok: false, error: "route not found" }, () => console.error("route not found"));
        return 1;
      }
      out({ ok: true, route: r }, () => console.log(JSON.stringify(r, null, 2)));
      return 0;
    }
    case "islands": {
      const name = str(flags, "name")?.toLowerCase();
      const islands = name
        ? idx.islands.filter((i) =>
          i.name.toLowerCase() === name || i.file.toLowerCase().includes(name)
        )
        : idx.islands;
      out({ ok: true, islands }, () => {
        for (const i of islands) {
          console.log(
            `${i.file}  ${i.name}/${i.exportName}  props=${
              i.props.map((p) => `${p.name}:${p.serializable}`).join(",") || "-"
            }  usedBy=${i.usedBy.length}  closure=${i.clientClosure.length}  violations=${i.violations.length}`,
          );
        }
      });
      return 0;
    }
    case "components": {
      const name = str(flags, "name")?.toLowerCase();
      const comps = name
        ? idx.components.filter((c) =>
          c.file.toLowerCase().includes(name) || c.exports.some((e) => e.toLowerCase() === name)
        )
        : idx.components;
      out({ ok: true, components: comps }, () => {
        for (const c of comps) {
          console.log(
            `${c.file}  ${c.boundary}  usedBy=${c.usedBy.length}  exports=${c.exports.join(",")}`,
          );
        }
      });
      return 0;
    }
    case "deps": {
      const file = str(flags, "file");
      if (!file) {
        console.error("--file required");
        return 3;
      }
      const importers = !!flags.importers;
      const depth = Number(str(flags, "depth") ?? 1);
      const seen = new Set([file]);
      const rows: { file: string; distance: number }[] = [];
      let frontier = [file];
      for (let d = 1; d <= depth && frontier.length; d++) {
        const next: string[] = [];
        for (const f of frontier) {
          const targets = importers
            ? (idx.graph.importedBy.get(f) ?? [])
            : (idx.graph.importsOf.get(f) ?? []).map((e) => e.target);
          for (const t of targets) {
            if (seen.has(t)) continue;
            seen.add(t);
            rows.push({ file: t, distance: d });
            next.push(t);
          }
        }
        frontier = next;
      }
      out({
        ok: true,
        file,
        direction: importers ? "importers" : "imports",
        files: rows,
        external: idx.graph.externalsOf.get(file) ?? [],
      }, () => {
        for (const r of rows) console.log(`${"  ".repeat(r.distance - 1)}${r.file}`);
        for (const e of idx.graph.externalsOf.get(file) ?? []) {
          console.log(`  (${e.scheme}) ${e.specifier}`);
        }
      });
      return 0;
    }
    case "usages": {
      const target = str(flags, "file");
      if (!target) {
        console.error("--file required");
        return 3;
      }
      const [file] = target.split("::");
      const importers = idx.graph.importedBy.get(file) ?? [];
      const renders = idx.graph.edges.filter((e) => e.kind === "renders" && e.to === file).map((
        e,
      ) => `${e.from}:${e.line}`);
      out({ ok: true, target, importers, renders }, () => {
        console.log("imported by:", importers.join(", ") || "-");
        console.log("rendered by:", renders.join(", ") || "-");
      });
      return 0;
    }
    case "impact": {
      let files = list(flags, "file");
      const base = str(flags, "base");
      if (base) {
        files = [...files, ...(await gitChangedFiles(idx.workspace, base, str(flags, "head")))];
      }
      if (!files.length) {
        console.error("--file or --base required");
        return 3;
      }
      const r = computeImpact(idx, files, Number(str(flags, "depth") ?? 3));
      out(r, () => {
        console.log("routes:");
        for (const x of r.routes) console.log(`  ${x.pattern ?? x.file}  ← ${x.why.join("; ")}`);
        console.log("islands:");
        for (const x of r.islands) console.log(`  ${x.file}  ← ${x.why.join("; ")}`);
        if (r.boundaryRisks.length) {
          console.log(
            `boundary risks: ${r.boundaryRisks.map((b) => b.id + " " + b.file).join(", ")}`,
          );
        }
        console.log("checks:");
        for (const c of r.suggestedChecks) console.log(`  ${c}`);
      });
      return 0;
    }
    case "trace": {
      const path = str(flags, "path");
      if (!path) {
        console.error("--path required");
        return 3;
      }
      const t = await traceRequest(idx, path, str(flags, "method") ?? "GET");
      out(t, () => {
        if (t.staticMatch) {
          console.log(
            `static: ${t.staticMatch.file} (served before routes: ${t.staticMatch.servedBeforeRoutes})`,
          );
        }
        if (t.matched) {
          console.log(
            `${t.method} ${t.path} → ${t.matched.route.file} (${t.matched.route.pattern}) params=${
              JSON.stringify(t.matched.params)
            }${t.matched.methodAllowed ? "" : "  [405: method not handled]"}`,
          );
          for (const c of t.chain) {
            console.log(`  ${c.step.padEnd(10)} ${c.file ?? "-"}  ${c.detail ?? ""}`);
          }
          if (t.islands.length) console.log(`  islands    ${t.islands.join(", ")}`);
        } else if (t.notFound) console.log(`${t.method} ${t.path} → ${t.notFound.detail}`);
        else console.log(`${t.method} ${t.path} → served by ${t.staticMatch?.file}`);
      });
      return 0;
    }
    case "boundaries": {
      const all = !!flags.all;
      out({
        ok: true,
        violations: idx.violations,
        modules: all ? [...idx.boundaries.values()] : [],
      }, () => {
        for (const v of idx.violations) {
          console.log(`${v.id} ${v.file}:${v.line ?? "-"}  ${v.chain.join(" → ")}  ${v.message}`);
        }
        if (all) {
          for (const b of idx.boundaries.values()) {
            console.log(`${b.boundary.padEnd(12)} ${b.file}`);
          }
        }
        if (!idx.violations.length) console.log("no boundary violations");
      });
      return 0;
    }
    case "validate": {
      const r = await validate(idx, {
        categories: list(flags, "category") as Category[],
        files: list(flags, "file"),
        external: { denoLint: !!flags["deno-lint"], denoCheck: !!flags["deno-check"] },
        fast: !!flags.fast,
      });
      out(r, () => {
        for (const f of r.findings) {
          console.log(
            `${f.severity.padEnd(7)} ${f.id.padEnd(6)} ${f.file}${
              f.line ? ":" + f.line : ""
            }  ${f.message}${f.hint ? `\n        hint: ${f.hint}` : ""}`,
          );
        }
        for (const u of r.summary.unverified) console.log(`unverified: ${u}`);
        console.log(
          `${
            r.ok ? "ok" : "not ok"
          } — ${r.summary.errors} errors, ${r.summary.warnings} warnings, ${r.summary.info} info`,
        );
      });
      return r.ok ? 0 : 1;
    }
    case "export": {
      const r = await exportGraph(idx, { path: str(flags, "path") });
      out(
        r,
        () =>
          console.log(
            `wrote ${r.path}: ${r.nodes} nodes, ${r.links} links ${
              JSON.stringify(r.byRelation)
            }\n${r.livespecSnippet}`,
          ),
      );
      return 0;
    }
    case "reindex": {
      out(
        { ok: true, ...idx.stats, skipped: idx.skipped },
        () => console.log(JSON.stringify(idx.stats)),
      );
      return 0;
    }
    default:
      console.error(`unknown command: ${command}\n\n${USAGE}`);
      return 3;
  }
}

if (import.meta.main) {
  try {
    Deno.exit(await main());
  } catch (e) {
    console.error(`fresh-mcp: ${(e as Error).message}`);
    Deno.exit(3);
  }
}
