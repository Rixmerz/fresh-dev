/** `fresh_trace`: which route/chain serves a URL (plan §4.4 precedence rules). */
import { join } from "@std/path";
import type { ProjectIndex } from "./index.ts";
import type { RouteEntry } from "./types.ts";
import { exists } from "./fs.ts";

export interface TraceResult {
  ok: true;
  path: string;
  method: string;
  matched: { route: RouteEntry; params: Record<string, string>; methodAllowed: boolean } | null;
  chain: { step: string; file: string | null; detail: string | null }[];
  islands: string[];
  staticMatch: { file: string; servedBeforeRoutes: boolean } | null;
  notFound: { file: string | null; detail: string } | null;
  errorRoute: string | null;
  partial: boolean;
  candidates: { pattern: string; file: string; kind: string }[];
}

export function isStaticPattern(p: string): boolean {
  return !/[:*{]/.test(p);
}

export function matchPattern(pattern: string, pathname: string): Record<string, string> | null {
  try {
    const up = new URLPattern({ pathname: pattern });
    const m = up.exec({ pathname });
    if (!m) return null;
    const groups: Record<string, string> = {};
    for (const [k, v] of Object.entries(m.pathname.groups)) {
      if (v !== undefined && !/^\d+$/.test(k)) groups[k] = v;
    }
    return groups;
  } catch {
    return null;
  }
}

export async function traceRequest(
  index: ProjectIndex,
  rawPath: string,
  method = "GET",
): Promise<TraceResult> {
  const url = new URL(rawPath, "http://fresh.local");
  const pathname = url.pathname === "" ? "/" : url.pathname;
  const partial = url.searchParams.get("fresh-partial") === "true";
  method = method.toUpperCase();

  // static files
  let staticMatch: TraceResult["staticMatch"] = null;
  for (const dir of index.detection.dirs.static) {
    const candidate = join(index.workspace, dir, pathname);
    if (pathname !== "/" && (await exists(candidate))) {
      staticMatch = {
        file: `${dir}${pathname}`,
        servedBeforeRoutes: index.version === "1" ||
          !!index.facts.get(index.detection.entry.main ?? "")?.callsStaticFiles,
      };
      break;
    }
  }

  const routable = index.routes.filter((r) =>
    r.pattern &&
    (r.kind === "page" || r.kind === "api" || r.kind === "page+handler" ||
      r.kind === "programmatic")
  );
  const ordered = [
    ...routable.filter((r) => isStaticPattern(r.pattern!)),
    ...routable.filter((r) => !isStaticPattern(r.pattern!)),
  ];
  let matched: TraceResult["matched"] = null;
  const candidates: TraceResult["candidates"] = [];
  for (const r of ordered) {
    const params = matchPattern(r.pattern!, pathname);
    if (!params) continue;
    candidates.push({ pattern: r.pattern!, file: r.file, kind: r.kind });
    if (!matched) {
      const allowed = r.methods.includes("ALL") || r.methods.includes(method) ||
        (method === "HEAD" && r.methods.includes("GET"));
      matched = { route: r, params, methodAllowed: allowed };
    }
  }

  const chain: TraceResult["chain"] = [];
  let islands: string[] = [];
  let notFound: TraceResult["notFound"] = null;
  let errorRoute: string | null = null;
  if (matched) {
    const r = matched.route;
    // wrappers only matter when something is rendered
    if (r.app && r.hasPage) chain.push({ step: "app", file: r.app, detail: "app wrapper" });
    for (const m of r.middlewares) {
      const prog = index.routes.find((x) => x.id === m && x.kind === "middleware");
      chain.push({
        step: "middleware",
        file: prog ? prog.file : m,
        detail: prog ? m : `scope ${index.routes.find((x) => x.file === m)?.scope ?? "?"}`,
      });
    }
    if (r.hasPage) {
      for (const l of r.layouts) {
        chain.push({
          step: "layout",
          file: l,
          detail: `scope ${index.routes.find((x) => x.file === l)?.scope ?? "?"}`,
        });
      }
    }
    if (r.kind === "programmatic") {
      chain.push({
        step: "handler",
        file: r.file,
        detail: `${
          r.methods.join(",")
        } — registered at ${r.registeredAt?.file}:${r.registeredAt?.line}${
          matched.methodAllowed ? "" : ` — ${method} not handled (405)`
        }`,
      });
    } else if (r.hasHandler) {
      chain.push({
        step: "handler",
        file: r.file,
        detail: `${r.methods.join(",")}${
          matched.methodAllowed ? "" : ` — ${method} not handled (405)`
        }`,
      });
    }
    if (r.hasPage) {
      chain.push({
        step: "page",
        file: r.file,
        detail: r.config?.skipAppWrapper ? "skipAppWrapper" : null,
      });
    }
    islands = r.islands;
    errorRoute = r.errorRoute;
  } else if (staticMatch?.servedBeforeRoutes) {
    notFound = null; // the static file answers
  } else {
    const nf = index.routes.find((r) => r.kind === "notFound") ??
      index.routes.find((r) => r.kind === "error" && r.scope === "/");
    notFound = {
      file: nf?.file ?? null,
      detail: nf
        ? `no route matches; ${nf.file} renders the 404`
        : "no route matches and no _404/_error route exists",
    };
  }

  return {
    ok: true,
    path: pathname,
    method,
    matched,
    chain,
    islands,
    staticMatch,
    notFound,
    errorRoute,
    partial,
    candidates,
  };
}
