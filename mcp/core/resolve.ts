/** Import specifier resolution: deno.json import map + relative paths (plan D2, local tier). */
import type { DenoConfig } from "./types.ts";
import { dirname, joinRel } from "./fs.ts";

export type Resolved =
  | { kind: "local"; path: string; viaImportMap: boolean }
  | {
    kind: "external";
    specifier: string;
    scheme: "jsr" | "npm" | "https" | "node" | "bare";
    viaImportMap: boolean;
  }
  | { kind: "unresolved"; specifier: string; reason: string };

export function schemeOf(spec: string): "jsr" | "npm" | "https" | "node" | "bare" | null {
  if (spec.startsWith("jsr:")) return "jsr";
  if (spec.startsWith("npm:")) return "npm";
  if (spec.startsWith("node:")) return "node";
  if (/^https?:\/\//.test(spec)) return "https";
  return null;
}

function isRelative(spec: string): boolean {
  return spec.startsWith("./") || spec.startsWith("../") || spec === "." || spec === "..";
}

function applyImportMap(spec: string, map: Record<string, string>): string | null {
  if (spec in map) return map[spec];
  let best: string | null = null;
  for (const key of Object.keys(map)) {
    if (key.endsWith("/") && spec.startsWith(key) && (best === null || key.length > best.length)) {
      best = key;
    }
  }
  if (best !== null) return map[best] + spec.slice(best.length);
  // Deno expands `"fresh": "jsr:@fresh/core@^2"` to cover `fresh/runtime` as well.
  for (const key of Object.keys(map)) {
    if (key.endsWith("/")) continue;
    const val = map[key];
    if (spec.startsWith(key + "/") && (val.startsWith("jsr:") || val.startsWith("npm:"))) {
      return val + spec.slice(key.length);
    }
  }
  return null;
}

/**
 * Resolve `spec` as imported from workspace-relative `fromFile`.
 * Local results are workspace-relative POSIX paths (existence is checked by the caller).
 */
export function resolveSpecifier(spec: string, fromFile: string, config: DenoConfig): Resolved {
  if (isRelative(spec)) {
    return { kind: "local", path: joinRel(dirname(fromFile), spec), viaImportMap: false };
  }
  if (spec.startsWith("file://")) {
    return {
      kind: "local",
      path: spec.slice("file://".length).replace(/^\/+/, ""),
      viaImportMap: false,
    };
  }
  if (spec.startsWith("/")) {
    return { kind: "local", path: spec.slice(1), viaImportMap: false };
  }
  const direct = schemeOf(spec);
  if (direct) return { kind: "external", specifier: spec, scheme: direct, viaImportMap: false };

  // import map (scopes are ignored: Fresh templates never use them)
  const mapped = applyImportMap(spec, config.imports);
  if (mapped !== null) {
    if (isRelative(mapped) || mapped.startsWith("/")) {
      const base = mapped.startsWith("/") ? mapped.slice(1) : joinRel(config.dir, mapped);
      return { kind: "local", path: base, viaImportMap: true };
    }
    if (mapped.startsWith("file://")) {
      return { kind: "local", path: mapped.slice("file://".length), viaImportMap: true };
    }
    const s = schemeOf(mapped);
    if (s) return { kind: "external", specifier: mapped, scheme: s, viaImportMap: true };
    return { kind: "external", specifier: mapped, scheme: "bare", viaImportMap: true };
  }
  return { kind: "unresolved", specifier: spec, reason: "bare specifier not in import map" };
}

/** Does `spec` (as written or as mapped) match one of the configured prefixes? */
export function matchesSpecifierList(
  spec: string,
  mapped: string | null,
  list: string[],
): string | null {
  const candidates = [spec, mapped].filter((x): x is string => !!x);
  for (const c of candidates) {
    const bare = c.replace(/^(jsr:|npm:)\/?/, "").replace(/@[\^~]?\d[^/]*/, "");
    for (const entry of list) {
      if (entry.endsWith(":")) {
        if (c.startsWith(entry)) return entry;
        continue;
      }
      const e = entry.replace(/^(jsr:|npm:)\/?/, "");
      if (c === entry || c.startsWith(entry + "/") || bare === e || bare.startsWith(e + "/")) {
        return entry;
      }
    }
  }
  return null;
}
