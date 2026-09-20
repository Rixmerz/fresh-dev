import type { Finding } from "../core/types.ts";
import { join } from "@std/path";
import { finding, inScope, type Rule } from "./rule.ts";
import { isHttpMethod } from "../core/parse.ts";
import { basename, dirname, TEST_FILE_PATTERN, walkFiles } from "../core/fs.ts";

const pageLike = new Set(["page", "api", "page+handler"]);

export const routeRules: Rule[] = [
  {
    id: "R001",
    category: "routes",
    severity: "error",
    versions: ["1", "2"],
    title: "invalid route file name",
    run(ctx) {
      const out: Finding[] = [];
      for (const r of ctx.index.routes) {
        if (r.kind === "programmatic" || !inScope(ctx, r.file)) continue;
        const problems: string[] = [];
        const segs = r.id.split("/").filter(Boolean);
        segs.forEach((s, i) => {
          if (/\s/.test(s)) problems.push(`segment "${s}" contains whitespace`);
          if (s === "[]" || s === "[[]]") {
            problems.push(`segment "${s}" has an empty parameter name`);
          }
          if (s.includes("][")) problems.push(`segment "${s}" has adjacent parameters (ambiguous)`);
          if (s.startsWith("[...") && i !== segs.length - 1) {
            problems.push(`catch-all "${s}" must be the last segment`);
          }
          if (s.startsWith("[[") && !/^\[\[[^\]]+\]\]$/.test(s)) {
            problems.push(`optional segment "${s}" must be the whole segment`);
          }
          if ((s.match(/\[/g) ?? []).length !== (s.match(/\]/g) ?? []).length) {
            problems.push(`unbalanced brackets in "${s}"`);
          }
        });
        for (const e of r.extra) if (e.startsWith("pattern error")) problems.push(e);
        for (const p of problems) {
          out.push(
            finding(this, r.file, p, {
              hint: "see Fresh file routing: [id], [...rest], [[optional]], (group)",
            }),
          );
        }
      }
      return out;
    },
  },
  {
    id: "R002",
    category: "routes",
    severity: "error",
    versions: ["1", "2"],
    title: "route module exports nothing Fresh can use",
    run(ctx) {
      const out: Finding[] = [];
      for (const r of ctx.index.routes) {
        if (!pageLike.has(r.kind) || !inScope(ctx, r.file)) continue;
        if (!r.hasPage && !r.hasHandler && !r.config) {
          out.push(
            finding(
              this,
              r.file,
              "route file has no default component, no handler/handlers export and no config export",
              {
                hint: ctx.index.version === "2"
                  ? 'Fresh 2 throws "Could not find relevant exports" at startup'
                  : "export a default component or a `handler`",
              },
            ),
          );
        }
      }
      return out;
    },
  },
  {
    id: "R003",
    category: "routes",
    severity: "error",
    versions: ["1", "2"],
    title: "JSX/component in a .ts API route",
    run(ctx) {
      const out: Finding[] = [];
      for (const r of ctx.index.routes) {
        if (!pageLike.has(r.kind) || !inScope(ctx, r.file) || !/\.(ts|js)$/.test(r.file)) continue;
        const f = ctx.index.facts.get(r.file);
        if (
          f?.hasJsx ||
          (r.hasPage &&
            f?.imports.some((i) => i.specifier === "preact" || i.specifier.startsWith("preact/")))
        ) {
          out.push(
            finding(
              this,
              r.file,
              "a .ts/.js route contains JSX or a page component; use .tsx for pages",
              { line: f?.exports.find((e) => e.isDefault)?.line },
            ),
          );
        }
      }
      return out;
    },
  },
  {
    id: "R004",
    category: "routes",
    severity: "error",
    versions: ["1", "2"],
    title: "handler object with a non-HTTP key",
    run(ctx) {
      const out: Finding[] = [];
      for (const [file, f] of ctx.index.facts) {
        if (!inScope(ctx, file) || !f.handler || f.handler.shape !== "object") continue;
        const r = ctx.index.routeByFile(file);
        if (!r || r.kind === "middleware") continue;
        for (const m of f.handler.methods) {
          if (!isHttpMethod(m.toUpperCase())) {
            out.push(
              finding(
                this,
                file,
                `handler key "${m}" is not an HTTP method (HEAD|GET|POST|PATCH|PUT|DELETE|OPTIONS)`,
                { line: f.handler.line },
              ),
            );
          } else if (m !== m.toUpperCase()) {
            out.push(
              finding(this, file, `handler key "${m}" must be upper-case ("${m.toUpperCase()}")`, {
                line: f.handler.line,
              }),
            );
          }
        }
      }
      return out;
    },
  },
  {
    id: "R005",
    category: "routes",
    severity: "error",
    versions: ["1", "2"],
    title: "middleware without a usable export",
    run(ctx) {
      const out: Finding[] = [];
      for (const r of ctx.index.routes) {
        if (
          r.kind !== "middleware" || r.kind === "middleware" && r.registeredAt ||
          !inScope(ctx, r.file)
        ) continue;
        const f = ctx.index.facts.get(r.file);
        const def = f?.exports.find((e) => e.isDefault);
        const okDefault = ctx.index.version === "2" && def &&
          (def.isFunction || def.kind === "const");
        if (!f?.handler && !okDefault) {
          out.push(
            finding(
              this,
              r.file,
              ctx.index.version === "2"
                ? "_middleware must export `default` (define.middleware(fn) or an array) or `handler`/`handlers`"
                : "_middleware.ts must export `handler` (a function or an array of functions)",
              { line: 1 },
            ),
          );
        }
      }
      return out;
    },
  },
  {
    id: "R006",
    category: "routes",
    severity: "error",
    versions: ["1", "2"],
    title: "two files produce the same URL pattern",
    run(ctx) {
      const out: Finding[] = [];
      const byPattern = new Map<string, typeof ctx.index.routes>();
      for (const r of ctx.index.routes) {
        if (!pageLike.has(r.kind) || !r.pattern) continue;
        const list = byPattern.get(r.pattern) ?? [];
        list.push(r);
        byPattern.set(r.pattern, list);
      }
      for (const [pattern, list] of byPattern) {
        if (list.length < 2) continue;
        for (const r of list) {
          if (!inScope(ctx, r.file)) continue;
          const others = list.filter((x) => x !== r).map((x) => x.file).join(", ");
          out.push(
            finding(this, r.file, `pattern "${pattern}" is also produced by ${others}`, {
              hint: "only one of them can win; remove or rename the duplicate",
            }),
          );
        }
      }
      return out;
    },
  },
  {
    id: "R007",
    category: "routes",
    severity: "warning",
    versions: ["1", "2"],
    title: "sibling dynamic segments with different names",
    run(ctx) {
      const out: Finding[] = [];
      const byDir = new Map<string, Map<string, string[]>>();
      for (const r of ctx.index.routes) {
        if (!pageLike.has(r.kind)) continue;
        const name = basename(r.id);
        if (!/^\[[^.\[]/.test(name)) continue;
        const dir = dirname(r.id);
        const m = byDir.get(dir) ?? new Map();
        const list = m.get(name) ?? [];
        list.push(r.file);
        m.set(name, list);
        byDir.set(dir, m);
      }
      for (const [dir, m] of byDir) {
        if (m.size < 2) continue;
        const names = [...m.keys()];
        for (const [, files] of m) {
          for (const file of files) {
            if (!inScope(ctx, file)) continue;
            out.push(
              finding(
                this,
                file,
                `directory ${dir || "/"} has sibling dynamic routes ${
                  names.join(", ")
                }; which one matches is registration order, not intent`,
                {
                  hint:
                    "keep one dynamic segment per directory or disambiguate with a literal prefix",
                },
              ),
            );
          }
        }
      }
      return out;
    },
  },
  {
    id: "R008",
    category: "routes",
    severity: "error",
    versions: ["1"],
    title: "fresh.gen.ts is out of sync with the disk",
    run(ctx) {
      const out: Finding[] = [];
      const idx = ctx.index;
      const manifestFile = idx.detection.entry.manifest;
      if (!idx.manifest || !manifestFile) return out;
      const routesDir = idx.detection.dirs.routes ?? "routes";
      const onDisk = new Set([
        ...idx.routes.filter((r) => r.kind !== "programmatic").map((r) => r.file),
        ...idx.islandFiles.keys(),
      ]);
      const listed = new Set([...idx.manifest.routes, ...idx.manifest.islands]);
      for (const f of onDisk) {
        if (
          !listed.has(f) &&
          (f.startsWith(routesDir + "/") ||
            f.startsWith((idx.detection.dirs.islands ?? "islands") + "/"))
        ) {
          out.push(
            finding(this, manifestFile, `${f} exists on disk but is not in fresh.gen.ts`, {
              hint: "run `deno task manifest` (or start dev.ts) to regenerate",
            }),
          );
        }
      }
      for (const f of listed) {
        if (!idx.files.has(f)) {
          out.push(
            finding(this, manifestFile, `fresh.gen.ts references ${f}, which does not exist`, {
              hint: "run `deno task manifest`",
            }),
          );
        }
      }
      return out;
    },
  },
  {
    id: "R009",
    category: "routes",
    severity: "warning",
    versions: ["1", "2"],
    title: "routeOverride is not a literal",
    run(ctx) {
      const out: Finding[] = [];
      for (const r of ctx.index.routes) {
        if (r.config?.routeOverrideNonLiteral && inScope(ctx, r.file)) {
          out.push(
            finding(
              this,
              r.file,
              "config.routeOverride is computed; static analysis cannot know the real pattern",
              {
                confidence: "inferred",
                hint: "use a string literal so tools (and readers) can see the URL",
              },
            ),
          );
        }
      }
      return out;
    },
  },
  {
    id: "R010",
    category: "routes",
    severity: "warning",
    versions: ["2"],
    title: "define.* used without importing the project's define",
    run(ctx) {
      const out: Finding[] = [];
      const sources = new Map<string, number>();
      for (const f of ctx.index.facts.values()) {
        if (f.defineCalls.length && f.defineImportedFrom) {
          sources.set(f.defineImportedFrom, (sources.get(f.defineImportedFrom) ?? 0) + 1);
        }
      }
      for (const [file, f] of ctx.index.facts) {
        if (!f.defineCalls.length || !inScope(ctx, file)) continue;
        if (!f.defineImportedFrom) {
          out.push(
            finding(this, file, "uses define.* but does not import `define`", {
              hint: 'import { define } from "../utils.ts" (createDefine<State>())',
            }),
          );
        } else if (sources.size > 1) {
          const [major] = [...sources.entries()].sort((a, b) => b[1] - a[1])[0];
          if (f.defineImportedFrom !== major && !/utils\.ts$/.test(f.defineImportedFrom)) {
            out.push(
              finding(
                this,
                file,
                `imports define from "${f.defineImportedFrom}" while most files use "${major}"; State typing may diverge`,
                { severity: "info" },
              ),
            );
          }
        }
      }
      return out;
    },
  },
  {
    id: "R011",
    category: "routes",
    severity: "info",
    versions: ["1", "2"],
    title: "skipInheritedLayouts with nothing to skip",
    run(ctx) {
      const out: Finding[] = [];
      const layouts = ctx.index.routes.filter((r) => r.kind === "layout");
      for (const l of layouts) {
        if (!l.config?.skipInheritedLayouts || !inScope(ctx, l.file)) continue;
        const parents = layouts.filter((p) =>
          p !== l && (p.scope === "/" || l.scope.startsWith(p.scope + "/"))
        );
        if (parents.length === 0) {
          out.push(
            finding(
              this,
              l.file,
              "skipInheritedLayouts is set but no parent layout exists (no-op)",
            ),
          );
        }
      }
      return out;
    },
  },
  {
    id: "R012",
    category: "routes",
    severity: "error",
    versions: ["2"],
    title: "1.x-style (req, ctx) handler in Fresh 2",
    run(ctx) {
      const out: Finding[] = [];
      for (const [file, f] of ctx.index.facts) {
        if (!inScope(ctx, file) || !f.handler || f.handler.shape !== "function") continue;
        if (!ctx.index.routeByFile(file)) continue;
        if ((f.handler.paramCount ?? 0) > 1) {
          out.push(
            finding(
              this,
              file,
              `handler declares ${f.handler.paramCount} parameters; Fresh 2 handlers take a single (ctx)`,
              {
                line: f.handler.line,
                hint:
                  'Fresh 2 throws "Handlers must only have one argument" at startup; use ctx.req',
              },
            ),
          );
        }
      }
      return out;
    },
  },
  {
    id: "R013",
    category: "routes",
    severity: "error",
    versions: ["1"],
    title: "`handlers` export in Fresh 1",
    run(ctx) {
      const out: Finding[] = [];
      for (const [file, f] of ctx.index.facts) {
        if (
          !inScope(ctx, file) || f.handler?.exportName !== "handlers" ||
          !ctx.index.routeByFile(file)
        ) continue;
        out.push(
          finding(
            this,
            file,
            'Fresh 1 only recognises `handler`; a `handlers` export throws "Did you mean handler?" at startup',
            { line: f.handler.line },
          ),
        );
      }
      return out;
    },
  },
  {
    id: "R014",
    category: "routes",
    severity: "error",
    versions: ["2"],
    title: "by-method object in a middleware",
    run(ctx) {
      const out: Finding[] = [];
      for (const r of ctx.index.routes) {
        if (r.kind !== "middleware" || r.registeredAt || !inScope(ctx, r.file)) continue;
        const f = ctx.index.facts.get(r.file);
        if (f?.handler?.shape === "object") {
          out.push(
            finding(
              this,
              r.file,
              "Fresh 2 middleware does not support object handlers with GET/POST…; export a function or an array",
              { line: f.handler.line },
            ),
          );
        }
      }
      return out;
    },
  },
  {
    id: "R015",
    category: "routes",
    severity: "warning",
    versions: ["2"],
    title: "handler export in a layout",
    run(ctx) {
      const out: Finding[] = [];
      for (const r of ctx.index.routes) {
        if (r.kind !== "layout" || !inScope(ctx, r.file)) continue;
        const f = ctx.index.facts.get(r.file);
        if (f?.handler) {
          out.push(
            finding(this, r.file, "layouts ignore handler exports (Fresh warns at startup)", {
              line: f.handler.line,
            }),
          );
        }
      }
      return out;
    },
  },
  {
    id: "R016",
    category: "routes",
    severity: "error",
    versions: ["1", "2"],
    title: "_app without a default component",
    run(ctx) {
      const out: Finding[] = [];
      for (const r of ctx.index.routes) {
        if (r.kind !== "app" || !inScope(ctx, r.file)) continue;
        if (!ctx.index.facts.get(r.file)?.exports.some((e) => e.isDefault && e.isFunction)) {
          out.push(
            finding(
              this,
              r.file,
              "_app must export a default component that renders <Component />",
            ),
          );
        }
      }
      return out;
    },
  },
  {
    id: "R017",
    category: "routes",
    severity: "error",
    versions: ["2"],
    title: "app.listen() in Vite mode",
    run(ctx) {
      const out: Finding[] = [];
      const main = ctx.index.detection.entry.main;
      if (!main || ctx.index.detection.flavor !== "2.x-vite" || !inScope(ctx, main)) return out;
      const f = ctx.index.facts.get(main);
      const call = f?.appCalls.find((c) => c.method === "listen");
      if (call) {
        out.push(
          finding(
            this,
            main,
            "main.ts calls app.listen(); with the Vite plugin the server is started by `deno serve _fresh/server.js`, so this causes AddrInUse",
            { line: call.line, hint: "export the app and remove listen()" },
          ),
        );
      }
      return out;
    },
  },
  {
    id: "R018",
    category: "routes",
    severity: "error",
    versions: ["1", "2"],
    title: "extension the crawler does not read",
    async run(ctx) {
      const out: Finding[] = [];
      const idx = ctx.index;
      for (const dir of [idx.detection.dirs.routes, idx.detection.dirs.islands]) {
        if (!dir) continue;
        const files = await walkFiles(idx.workspace, join(idx.workspace, dir), {
          extensions: [".mts", ".mjs", ".cts", ".cjs"],
        });
        for (const f of files) {
          if (!inScope(ctx, f.path)) continue;
          out.push(
            finding(
              this,
              f.path,
              `Fresh only crawls .tsx/.jsx/.ts/.js under ${dir}/; this file is never a route or island`,
              { hint: "rename it to .ts/.tsx" },
            ),
          );
        }
      }
      return out;
    },
  },
  {
    id: "R019",
    category: "routes",
    severity: "info",
    versions: ["1", "2"],
    title: "test file under routes/ is ignored",
    run(ctx) {
      const out: Finding[] = [];
      const dir = ctx.index.detection.dirs.routes ?? "routes";
      for (const f of ctx.index.files.keys()) {
        if (f.startsWith(dir + "/") && TEST_FILE_PATTERN.test(f) && inScope(ctx, f)) {
          out.push(
            finding(
              this,
              f,
              "matches Fresh's test-file pattern and is skipped by the router (by design)",
            ),
          );
        }
      }
      return out;
    },
  },
  {
    id: "R020",
    category: "routes",
    severity: "error",
    versions: ["2"],
    title: "staticFiles() middleware missing",
    run(ctx) {
      const out: Finding[] = [];
      const main = ctx.index.detection.entry.main;
      if (!main || !inScope(ctx, main)) return out;
      const f = ctx.index.facts.get(main);
      if (f?.createsApp && !f.callsStaticFiles) {
        out.push(
          finding(
            this,
            main,
            "the App never calls app.use(staticFiles()); island JavaScript and static/ assets will not be served",
            { hint: 'import { staticFiles } from "fresh"; app.use(staticFiles());' },
          ),
        );
      }
      return out;
    },
  },
];
