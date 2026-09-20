/** Reading deno.json / deno.jsonc / importMap and the optional .fresh-dev/config.json. */
import { parse as parseJsonc } from "@std/jsonc";
import { join } from "@std/path";
import type { DenoConfig, FreshDevConfig } from "./types.ts";
import { dirname, exists, readText, toPosix } from "./fs.ts";

export const DEFAULT_SERVER_ONLY_SPECIFIERS = [
  "node:",
  "@std/fs",
  "$std/fs",
  "jsr:@std/fs",
  "@std/io",
  "$std/io",
  "jsr:@std/io",
  "@std/dotenv",
  "$std/dotenv",
  "jsr:@std/dotenv",
  "postgres",
  "pg",
  "npm:pg",
  "mysql",
  "mysql2",
  "mongodb",
  "redis",
  "ioredis",
  "deno-postgres",
  "@db/postgres",
  "jsr:@db/postgres",
  "kysely",
  "drizzle-orm",
  "@prisma/client",
  "prisma",
  "@supabase/supabase-js/server",
];

export const DEFAULT_BROWSER_ONLY_SPECIFIERS: string[] = [];

export const DEFAULT_FRESH_DEV_CONFIG: FreshDevConfig = {
  serverOnlySpecifiers: DEFAULT_SERVER_ONLY_SPECIFIERS,
  browserOnlySpecifiers: DEFAULT_BROWSER_ONLY_SPECIFIERS,
  ignore: [],
  maxFileBytes: 2_000_000,
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function asStringRecord(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(asRecord(v))) if (typeof val === "string") out[k] = val;
  return out;
}

export async function readDenoConfig(workspace: string): Promise<DenoConfig> {
  const candidates = ["deno.json", "deno.jsonc"];
  let path: string | null = null;
  let raw: Record<string, unknown> = {};
  for (const c of candidates) {
    const abs = join(workspace, c);
    const text = await readText(abs);
    if (text === null) continue;
    try {
      raw = asRecord(parseJsonc(text));
      path = c;
      break;
    } catch {
      path = c;
      raw = {};
      break;
    }
  }
  let imports = asStringRecord(raw.imports);
  let scopes: Record<string, Record<string, string>> = {};
  for (const [k, v] of Object.entries(asRecord(raw.scopes))) scopes[k] = asStringRecord(v);
  // External import map file
  if (typeof raw.importMap === "string") {
    const mapAbs = join(workspace, raw.importMap);
    const text = await readText(mapAbs);
    if (text) {
      try {
        const map = asRecord(parseJsonc(text));
        imports = { ...asStringRecord(map.imports), ...imports };
        for (const [k, v] of Object.entries(asRecord(map.scopes))) {
          scopes = { ...scopes, [k]: asStringRecord(v) };
        }
      } catch {
        // ignore unreadable import map
      }
    }
  }
  const lint = asRecord(raw.lint);
  const rules = asRecord(lint.rules);
  const tags = Array.isArray(rules.tags) ? rules.tags.filter((t) => typeof t === "string") : [];
  const workspaceMembers = Array.isArray(raw.workspace)
    ? raw.workspace.filter((m): m is string => typeof m === "string")
    : Array.isArray(asRecord(raw.workspace).members)
    ? (asRecord(raw.workspace).members as unknown[]).filter((m): m is string =>
      typeof m === "string"
    )
    : [];
  const nmd = raw.nodeModulesDir;
  return {
    path,
    dir: path ? dirname(toPosix(path)) : "",
    raw,
    imports,
    scopes,
    tasks: asStringRecord(raw.tasks),
    compilerOptions: asRecord(raw.compilerOptions),
    lintTags: tags as string[],
    workspace: workspaceMembers,
    nodeModulesDir: typeof nmd === "string" || typeof nmd === "boolean" ? nmd : null,
    exclude: Array.isArray(raw.exclude) ? raw.exclude.filter((e) => typeof e === "string") : [],
  };
}

export async function readFreshDevConfig(workspace: string): Promise<FreshDevConfig> {
  const abs = join(workspace, ".fresh-dev", "config.json");
  if (!(await exists(abs))) return { ...DEFAULT_FRESH_DEV_CONFIG };
  const text = await readText(abs);
  if (!text) return { ...DEFAULT_FRESH_DEV_CONFIG };
  try {
    const raw = asRecord(parseJsonc(text));
    const arr = (v: unknown, def: string[]) =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : def;
    return {
      serverOnlySpecifiers: [
        ...DEFAULT_SERVER_ONLY_SPECIFIERS,
        ...arr(raw.serverOnlySpecifiers, []),
      ],
      browserOnlySpecifiers: [
        ...DEFAULT_BROWSER_ONLY_SPECIFIERS,
        ...arr(raw.browserOnlySpecifiers, []),
      ],
      ignore: arr(raw.ignore, []),
      maxFileBytes: typeof raw.maxFileBytes === "number"
        ? raw.maxFileBytes
        : DEFAULT_FRESH_DEV_CONFIG.maxFileBytes,
    };
  } catch {
    return { ...DEFAULT_FRESH_DEV_CONFIG };
  }
}
