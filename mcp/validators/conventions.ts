import type { Finding } from "../core/types.ts";
import { join } from "@std/path";
import { finding, inScope, type Rule } from "./rule.ts";
import { readText } from "../core/fs.ts";

export const conventionRules: Rule[] = [
  {
    id: "C001",
    category: "conventions",
    severity: "warning",
    versions: ["1", "2"],
    title: "monolithic page",
    run(ctx) {
      const out: Finding[] = [];
      for (const r of ctx.index.routes) {
        if (!r.hasPage || !inScope(ctx, r.file)) continue;
        const f = ctx.index.facts.get(r.file);
        if (!f) continue;
        if (f.lineCount > 250 && r.renders.length === 0 && f.jsx.length > 40) {
          out.push(
            finding(
              this,
              r.file,
              `${f.lineCount} lines and ${f.jsx.length} JSX elements without any component; split sections into components/`,
              { line: 1 },
            ),
          );
        }
      }
      return out;
    },
  },
  {
    id: "C002",
    category: "conventions",
    severity: "info",
    versions: ["1", "2"],
    title: "_app.tsx document basics",
    run(ctx) {
      const out: Finding[] = [];
      for (const r of ctx.index.routes) {
        if (r.kind !== "app" || !inScope(ctx, r.file)) continue;
        const f = ctx.index.facts.get(r.file);
        if (!f) continue;
        const missing: string[] = [];
        const html = f.jsx.find((j) => j.tag === "html");
        if (!html) missing.push("<html>");
        else if (!html.attrs.includes("lang")) missing.push("<html lang>");
        if (!f.jsx.some((j) => j.tag === "meta" && j.attrs.includes("name"))) {
          missing.push('<meta name="viewport">');
        }
        if (!f.jsx.some((j) => j.tag === "title")) missing.push("<title>");
        if (missing.length) {
          out.push(
            finding(this, r.file, `missing ${missing.join(", ")}`, {
              line: f.exports.find((e) => e.isDefault)?.line,
            }),
          );
        }
      }
      return out;
    },
  },
  {
    id: "C003",
    category: "conventions",
    severity: "error",
    versions: ["1"],
    title: "Tailwind (Fresh 1) wiring",
    async run(ctx) {
      const out: Finding[] = [];
      const idx = ctx.index;
      const cfgFile = idx.detection.entry.config;
      const cfgText = cfgFile ? (await readText(join(idx.workspace, cfgFile))) ?? "" : "";
      const hasTwConfig = idx.files.has("tailwind.config.ts") ||
        idx.files.has("tailwind.config.js");
      const usesPlugin = /tailwind\(\)/.test(cfgText);
      if (!hasTwConfig && !usesPlugin && !idx.config.imports["tailwindcss"]) return out;
      const target = cfgFile ?? "deno.json";
      if (!usesPlugin && inScope(ctx, target)) {
        out.push(
          finding(
            this,
            target,
            "tailwind.config.ts exists but fresh.config.ts does not register the tailwind() plugin from $fresh/plugins/tailwind.ts",
          ),
        );
      }
      if (!hasTwConfig && inScope(ctx, "tailwind.config.ts")) {
        out.push(
          finding(
            this,
            "tailwind.config.ts",
            "tailwind() plugin is registered but tailwind.config.ts is missing",
          ),
        );
      }
      const css = await readText(join(idx.workspace, "static/styles.css"));
      if (
        css !== null && inScope(ctx, "static/styles.css") &&
        !/@tailwind\s+(base|components|utilities)/.test(css)
      ) {
        out.push(
          finding(
            this,
            "static/styles.css",
            "does not contain the @tailwind base/components/utilities directives (it looks like compiled CSS); the plugin overwrites nothing and styles never apply",
            { hint: "replace the file with the three @tailwind directives and restart" },
          ),
        );
      }
      if (hasTwConfig) {
        const twFile = idx.files.has("tailwind.config.ts")
          ? "tailwind.config.ts"
          : "tailwind.config.js";
        const tw = (await readText(join(idx.workspace, twFile))) ?? "";
        if (
          inScope(ctx, twFile) &&
          !(/routes/.test(tw) && /islands/.test(tw) && /components/.test(tw))
        ) {
          out.push(
            finding(
              this,
              twFile,
              'content globs should cover "{routes,islands,components}/**/*.{ts,tsx}"',
            ),
          );
        }
      }
      if (!idx.config.imports["tailwindcss"] && inScope(ctx, idx.config.path ?? "deno.json")) {
        out.push(
          finding(
            this,
            idx.config.path ?? "deno.json",
            'deno.json imports lack "tailwindcss" (npm:tailwindcss@3.x)',
          ),
        );
      }
      return out;
    },
  },
  {
    id: "C004",
    category: "conventions",
    severity: "error",
    versions: ["2"],
    title: "Tailwind (Fresh 2 / Vite) wiring",
    async run(ctx) {
      const out: Finding[] = [];
      const idx = ctx.index;
      if (idx.detection.flavor !== "2.x-vite") return out;
      const usesTw = !!idx.config.imports["tailwindcss"] ||
        !!idx.config.imports["@tailwindcss/vite"];
      if (!usesTw) return out;
      const vite = idx.detection.entry.vite;
      const viteText = vite ? (await readText(join(idx.workspace, vite))) ?? "" : "";
      if (
        !idx.config.imports["@tailwindcss/vite"] && inScope(ctx, idx.config.path ?? "deno.json")
      ) {
        out.push(
          finding(
            this,
            idx.config.path ?? "deno.json",
            'tailwindcss is imported but "@tailwindcss/vite" is not in deno.json imports',
          ),
        );
      }
      if (vite && inScope(ctx, vite) && !/tailwindcss\(\)/.test(viteText)) {
        out.push(
          finding(
            this,
            vite,
            "vite.config.ts does not add the tailwindcss() plugin next to fresh()",
          ),
        );
      }
      const client = idx.detection.entry.client;
      const cf = client ? idx.facts.get(client) : null;
      if (
        client && inScope(ctx, client) && cf &&
        !cf.imports.some((i) => i.specifier.endsWith(".css"))
      ) {
        out.push(
          finding(
            this,
            client,
            "client.ts does not import a CSS file; Tailwind 4 is loaded by importing the stylesheet from the client entry",
          ),
        );
      }
      return out;
    },
  },
  {
    id: "C005",
    category: "conventions",
    severity: "info",
    versions: ["1", "2"],
    title: "className instead of class",
    run(ctx) {
      const out: Finding[] = [];
      for (const [file, f] of ctx.index.facts) {
        if (!inScope(ctx, file)) continue;
        const use = f.jsx.find((j) => j.attrs.includes("className"));
        if (use) {
          out.push(
            finding(this, file, "uses className; Preact and the Fresh templates use `class`", {
              line: use.line,
            }),
          );
        }
      }
      return out;
    },
  },
  {
    id: "C006",
    category: "conventions",
    severity: "info",
    versions: ["1", "2"],
    title: "function handler answers every method",
    run(ctx) {
      const out: Finding[] = [];
      for (const r of ctx.index.routes) {
        if (r.kind !== "api" || r.handlerShape !== "function" || !inScope(ctx, r.file)) continue;
        out.push(
          finding(
            this,
            r.file,
            "a function-form handler receives every HTTP method; use the object form ({ GET, POST }) to get automatic 405s",
            { line: ctx.index.facts.get(r.file)?.handler?.line },
          ),
        );
      }
      return out;
    },
  },
  {
    id: "C007",
    category: "conventions",
    severity: "warning",
    versions: ["1", "2"],
    title: "deno lint fresh tag",
    run(ctx) {
      const cfg = ctx.index.config;
      const file = cfg.path ?? "deno.json";
      if (!inScope(ctx, file) || cfg.lintTags.includes("fresh")) return [];
      return [
        finding(
          this,
          file,
          'lint.rules.tags does not include "fresh"; fresh-server-event-handlers and the jsx-* rules stay off',
          { hint: '"lint": { "rules": { "tags": ["fresh", "recommended"] } }' },
        ),
      ];
    },
  },
  {
    id: "C009",
    category: "conventions",
    severity: "info",
    versions: ["2"],
    title: "code-imported asset inside static/",
    run(ctx) {
      const out: Finding[] = [];
      if (ctx.index.detection.flavor !== "2.x-vite") return out;
      for (const e of ctx.index.graph.edges) {
        if (
          e.kind !== "references_asset" || e.detail !== "imported asset" || !inScope(ctx, e.from)
        ) continue;
        const target = e.to.replace(/^asset:/, "");
        if (ctx.index.detection.dirs.static.some((d) => target.startsWith(d + "/"))) {
          out.push(
            finding(
              this,
              e.from,
              `imports ${target} from static/; files imported from code belong in assets/ (static/ is for URL-referenced files)`,
              { line: e.line },
            ),
          );
        }
      }
      return out;
    },
  },
];
