import type { Finding } from "../core/types.ts";
import { finding, inScope, type Rule } from "./rule.ts";
import { GROUP_REG } from "../core/routes.ts";

export const islandRules: Rule[] = [
  {
    id: "I001",
    category: "islands",
    severity: "error",
    versions: ["1", "2"],
    title: "island file without an exported function",
    run(ctx) {
      const out: Finding[] = [];
      for (const i of ctx.index.islands) {
        if (i.exportName === "(none)" && inScope(ctx, i.file)) {
          out.push(
            finding(
              this,
              i.file,
              "no exported function; every exported function in an island file becomes an island, so this file registers none",
              { line: 1 },
            ),
          );
        }
      }
      return out;
    },
  },
  {
    id: "I002",
    category: "islands",
    severity: "error",
    versions: ["1", "2"],
    title: "non-serializable island prop",
    run(ctx) {
      const out: Finding[] = [];
      for (const i of ctx.index.islands) {
        if (!inScope(ctx, i.file)) continue;
        for (const p of i.props) {
          if (p.serializable === "no") {
            out.push(
              finding(
                this,
                i.file,
                `prop \`${p.name}: ${p.typeText}\` of island ${i.name} cannot be serialized: ${p.reason}`,
                {
                  line: i.line,
                  hint: ctx.index.version === "2"
                    ? "Fresh 2 serializes JSON values, Date/Map/Set/URL/RegExp/Temporal, Uint8Array, bigint, signals and JSX — never functions or class instances"
                    : "Fresh 1 serializes JSON values, Uint8Array, signals and JSX children only",
                },
              ),
            );
          } else if (p.serializable === "unknown") {
            out.push(
              finding(
                this,
                i.file,
                `prop \`${p.name}: ${p.typeText}\` of island ${i.name} is a named type; if it is a class instance it loses its prototype in the browser`,
                { line: i.line, severity: "info", confidence: "inferred" },
              ),
            );
          }
        }
      }
      return out;
    },
  },
  {
    id: "I004",
    category: "islands",
    severity: "error",
    versions: ["1", "2"],
    title: "interactivity outside an island",
    run(ctx) {
      const out: Finding[] = [];
      const idx = ctx.index;
      for (const [file, f] of idx.facts) {
        if (!inScope(ctx, file) || !f.hasJsx || idx.islandFiles.has(file) || f.isTest) continue;
        const b = idx.boundaries.get(file);
        if (
          b && (b.boundary === "client" || b.boundary === "shared" || b.boundary === "client-entry")
        ) continue; // hydrated inside an island
        const handlers = f.jsx.filter((j) => j.hasEventHandler);
        // useSignal/useComputed/useMemo are legitimate on the server (a signal created in a
        // route and passed to an island is the official template); state/effect hooks are not.
        const hooks = f.hooks.filter((h) =>
          ["useState", "useEffect", "useLayoutEffect", "useReducer", "useSignalEffect", "useRef"]
            .includes(h)
        );
        if (handlers.length === 0 && hooks.length === 0) continue;
        const what = [
          ...handlers.slice(0, 2).map((h) =>
            `<${h.tag} ${h.attrs.filter((a) => /^on/i.test(a)).join(" ")}>`
          ),
          ...hooks.map((h) => `${h}()`),
        ].join(", ");
        const where = idx.routeByFile(file) ? "a route" : "a server-rendered component";
        out.push(
          finding(
            this,
            file,
            `${where} uses ${what}; only islands are hydrated, so this never runs in the browser`,
            {
              severity: handlers.length ? "error" : "warning",
              line: handlers[0]?.line ?? f.exports.find((e) => e.isFunction)?.line ?? 1,
              hint:
                "move the interactive part to islands/ (deno lint: fresh-server-event-handlers)",
            },
          ),
        );
      }
      return out;
    },
  },
  {
    id: "I005",
    category: "islands",
    severity: "warning",
    versions: ["1", "2"],
    title: "island consumed through a barrel re-export",
    run(ctx) {
      const out: Finding[] = [];
      for (const e of ctx.index.graph.edges) {
        if (
          e.kind !== "renders" || e.confidence !== "inferred" || !ctx.index.islandFiles.has(e.to) ||
          !inScope(ctx, e.from)
        ) continue;
        out.push(
          finding(
            this,
            e.from,
            `renders island ${e.to} through a re-export; import islands directly so the dependency is visible to tooling`,
            { line: e.line, confidence: "inferred" },
          ),
        );
      }
      return out;
    },
  },
  {
    id: "I006",
    category: "islands",
    severity: "warning",
    versions: ["1", "2"],
    title: "oversized island bundle",
    run(ctx) {
      const out: Finding[] = [];
      const seen = new Set<string>();
      for (const i of ctx.index.islands) {
        if (seen.has(i.file) || !inScope(ctx, i.file)) continue;
        seen.add(i.file);
        if (i.clientClosure.length > 20) {
          out.push(
            finding(
              this,
              i.file,
              `client bundle pulls ${i.clientClosure.length} local modules; check for a barrel import (components/index.ts) dragging the whole tree`,
              { line: i.line },
            ),
          );
        }
      }
      return out;
    },
  },
  {
    id: "I007",
    category: "islands",
    severity: "error",
    versions: ["1", "2"],
    title: "(_islands) folder outside routes/",
    run(ctx) {
      const out: Finding[] = [];
      const routesDir = (ctx.index.detection.dirs.routes ?? "routes") + "/";
      for (const f of ctx.index.files.keys()) {
        if (/(^|\/)\(_islands\)\//.test(f) && !f.startsWith(routesDir) && inScope(ctx, f)) {
          out.push(
            finding(
              this,
              f,
              "the crawler only recognises (_islands) folders under routes/; this file is not an island",
              { hint: "move it under routes/…/(_islands)/ or into islands/" },
            ),
          );
        }
      }
      void GROUP_REG;
      return out;
    },
  },
  {
    id: "I008",
    category: "islands",
    severity: "warning",
    versions: ["1", "2"],
    title: "browser global in an island without a guard",
    run(ctx) {
      const out: Finding[] = [];
      for (const file of ctx.index.islandFiles.keys()) {
        if (!inScope(ctx, file)) continue;
        const b = ctx.index.boundaries.get(file);
        const s = b?.browserSignals[0];
        if (s) {
          out.push(
            finding(
              this,
              file,
              `uses \`${s.detail}\` at render time; islands are also rendered on the server, guard it with IS_BROWSER or useEffect`,
              { line: s.line },
            ),
          );
        }
      }
      return out;
    },
  },
];
