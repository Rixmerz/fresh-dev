import type { Finding } from "../core/types.ts";
import { finding, inScope, type Rule } from "./rule.ts";
import { basename } from "../core/fs.ts";

export const boundaryRules: Rule[] = [
  {
    id: "B001",
    category: "boundaries",
    severity: "error",
    versions: ["1", "2"],
    title: "server-only code reachable from the browser",
    run(ctx) {
      const out: Finding[] = [];
      const seen = new Set<string>();
      for (const v of ctx.index.violations) {
        if (v.id !== "B001") continue;
        const key = v.chain.join(">") + v.signal.detail;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!inScope(ctx, v.file) && !inScope(ctx, v.chain[0])) continue;
        out.push(finding(this, v.file, `${v.message}; chain: ${v.chain.join(" → ")}`, {
          line: v.line,
          hint: "move the server code to a route handler / middleware and pass data as props",
        }));
      }
      return out;
    },
  },
  {
    id: "B002",
    category: "boundaries",
    severity: "warning",
    versions: ["1", "2"],
    title: "browser global in server-only code",
    run(ctx) {
      const out: Finding[] = [];
      for (const v of ctx.index.violations) {
        if (v.id !== "B002" || !inScope(ctx, v.file)) continue;
        out.push(
          finding(this, v.file, v.message, {
            line: v.line,
            hint: "wrap it in `if (IS_BROWSER)` or move it to an island",
          }),
        );
      }
      return out;
    },
  },
  {
    id: "B003",
    category: "boundaries",
    severity: "warning",
    versions: ["1", "2"],
    title: "IS_BROWSER imported from the wrong module",
    run(ctx) {
      const out: Finding[] = [];
      const expected = ctx.index.version === "2" ? "fresh/runtime" : "$fresh/runtime.ts";
      for (const [file, f] of ctx.index.facts) {
        if (!f.isBrowserImportedFrom || !inScope(ctx, file)) continue;
        if (f.isBrowserImportedFrom !== expected) {
          out.push(
            finding(
              this,
              file,
              `IS_BROWSER is imported from "${f.isBrowserImportedFrom}"; Fresh ${ctx.index.version} exports it from "${expected}"`,
            ),
          );
        }
      }
      return out;
    },
  },
  {
    id: "B004",
    category: "boundaries",
    severity: "info",
    versions: ["1", "2"],
    title: "server-looking module without server signals",
    run(ctx) {
      const out: Finding[] = [];
      for (const [file, b] of ctx.index.boundaries) {
        if (!inScope(ctx, file)) continue;
        const name = basename(file);
        if (
          (b.boundary === "shared" || b.boundary === "client") && b.serverSignals.length === 0 &&
          /(^|[._-])(db|database|server|kv|secret|secrets)([._-]|\.ts$)/i.test(name)
        ) {
          out.push(
            finding(
              this,
              file,
              `${name} is bundled for the browser (reachable from ${
                b.reachableFrom.join(", ")
              }) although its name suggests server code`,
              { confidence: "inferred" },
            ),
          );
        }
      }
      return out;
    },
  },
];
