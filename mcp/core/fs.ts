/** Filesystem helpers: walking, hashing, path normalisation. All paths are POSIX. */
import { join, relative, SEPARATOR } from "@std/path";

export const SOURCE_EXTS = [".ts", ".tsx", ".js", ".jsx"] as const;
/** Fresh's crawler ignores test files with this exact pattern (constants.ts). */
export const TEST_FILE_PATTERN = /[._]test\.(?:[tj]sx?|[mc][tj]s)$/;
export const IGNORED_DIRS = new Set([
  "node_modules",
  "_fresh",
  ".git",
  "vendor",
  ".fresh-dev",
  ".mcp-docs",
  ".vise",
  "dist",
  "build",
  ".vite",
  ".cache",
  "coverage",
]);

export function toPosix(p: string): string {
  return SEPARATOR === "/" ? p : p.split(SEPARATOR).join("/");
}

export function rel(workspace: string, abs: string): string {
  const r = toPosix(relative(workspace, abs));
  return r.startsWith("./") ? r.slice(2) : r;
}

export function isSourceFile(path: string): boolean {
  return SOURCE_EXTS.some((e) => path.endsWith(e));
}

export function stripExt(path: string): string {
  const i = path.lastIndexOf(".");
  const slash = path.lastIndexOf("/");
  return i > slash ? path.slice(0, i) : path;
}

export function extOf(path: string): string {
  const i = path.lastIndexOf(".");
  const slash = path.lastIndexOf("/");
  return i > slash ? path.slice(i) : "";
}

export interface FileStat {
  path: string; // workspace-relative POSIX
  abs: string;
  size: number;
  mtime: number;
}

/**
 * Recursively list files under `dir` (absolute). Returns workspace-relative paths.
 * `extensions` filters by suffix; `ignoreGlobs` are simple prefix/suffix globs
 * (`assets/`, `*.min.js`, `**\/generated/**`).
 */
export async function walkFiles(
  workspace: string,
  dir: string,
  opts: { extensions?: readonly string[]; ignore?: string[]; maxDepth?: number } = {},
): Promise<FileStat[]> {
  const out: FileStat[] = [];
  const ignore = (opts.ignore ?? []).map(globToRegExp);
  async function visit(current: string, depth: number) {
    let entries: Deno.DirEntry[];
    try {
      entries = [];
      for await (const e of Deno.readDir(current)) entries.push(e);
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      const abs = join(current, e.name);
      const r = rel(workspace, abs);
      if (e.isDirectory) {
        if (IGNORED_DIRS.has(e.name)) continue;
        if (ignore.some((re) => re.test(r + "/"))) continue;
        if (opts.maxDepth !== undefined && depth >= opts.maxDepth) continue;
        await visit(abs, depth + 1);
      } else if (e.isFile) {
        if (opts.extensions && !opts.extensions.some((x) => e.name.endsWith(x))) continue;
        if (ignore.some((re) => re.test(r))) continue;
        try {
          const st = await Deno.stat(abs);
          out.push({ path: r, abs, size: st.size, mtime: st.mtime?.getTime() ?? 0 });
        } catch {
          // vanished between readDir and stat
        }
      }
    }
  }
  await visit(dir, 0);
  return out;
}

export function globToRegExp(glob: string): RegExp {
  let g = glob.trim();
  if (g.startsWith("./")) g = g.slice(2);
  const anchored = g.startsWith("/");
  if (anchored) g = g.slice(1);
  let re = "";
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*") {
      if (g[i + 1] === "*") {
        re += ".*";
        i++;
        if (g[i + 1] === "/") i++;
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else if (".+^${}()|[]\\".includes(c)) re += "\\" + c;
    else re += c;
  }
  // a bare directory name (`assets/`) matches at any depth unless anchored
  return new RegExp((anchored ? "^" : "(^|/)") + re);
}

export async function exists(abs: string): Promise<boolean> {
  try {
    await Deno.stat(abs);
    return true;
  } catch {
    return false;
  }
}

export async function isDir(abs: string): Promise<boolean> {
  try {
    return (await Deno.stat(abs)).isDirectory;
  } catch {
    return false;
  }
}

export async function readText(abs: string): Promise<string | null> {
  try {
    return await Deno.readTextFile(abs);
  } catch {
    return null;
  }
}

/** FNV-1a 64-bit as hex — fast, dependency-free content hash (not cryptographic). */
export function hashText(text: string): string {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < text.length; i++) {
    h ^= BigInt(text.charCodeAt(i));
    h = (h * prime) & mask;
  }
  return h.toString(16).padStart(16, "0");
}

export function dirname(p: string): string {
  const i = p.lastIndexOf("/");
  return i < 0 ? "" : p.slice(0, i);
}

export function basename(p: string): string {
  const i = p.lastIndexOf("/");
  return i < 0 ? p : p.slice(i + 1);
}

/** Resolve `../x` style relative paths against a POSIX directory, workspace-relative. */
export function joinRel(dir: string, spec: string): string {
  const parts = (dir ? dir.split("/") : []).filter(Boolean);
  for (const seg of spec.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}
