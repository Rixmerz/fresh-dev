/** Fresh project detection (plan §4.2). Cheap: reads deno.json and stats a few paths. */
import { join } from "@std/path";
import type { DenoConfig, Detection, Flavor, FreshVersion } from "./types.ts";
import { readDenoConfig } from "./config.ts";
import { exists, isDir, readText } from "./fs.ts";

const FRESH1_RE = /^https?:\/\/deno\.land\/x\/fresh(@([^/]+))?\//;

function versionFromSpecifier(spec: string): string | null {
  const m = spec.match(/@([~^]?\d[^/]*)/);
  return m ? m[1] : null;
}

async function firstExisting(workspace: string, names: string[]): Promise<string | null> {
  for (const n of names) if (await exists(join(workspace, n))) return n;
  return null;
}

export async function detectFresh(workspace: string, cfg?: DenoConfig): Promise<Detection> {
  const config = cfg ?? (await readDenoConfig(workspace));
  const evidence: string[] = [];
  let version: FreshVersion | null = null;
  let flavor: Flavor = "unknown";
  let freshSpecifier: string | null = null;
  let freshVersion: string | null = null;
  let preactSpecifier: string | null = null;

  // --- import map signals (decisive) ---
  const imports = config.imports;
  const fresh2 = imports["fresh"] ?? imports["@fresh/core"];
  if (fresh2 && fresh2.includes("@fresh/core")) {
    version = "2";
    freshSpecifier = fresh2;
    freshVersion = versionFromSpecifier(fresh2);
    evidence.push(`deno.json imports["fresh"] = ${fresh2} (@fresh/update detectFresh2 rule)`);
  }
  const fresh1 = imports["$fresh/"];
  if (fresh1 && FRESH1_RE.test(fresh1)) {
    if (version === "2") evidence.push(`deno.json also has $fresh/ = ${fresh1} (mixed 1.x/2.x)`);
    else {
      version = "1";
      freshSpecifier = fresh1;
      freshVersion = fresh1.match(FRESH1_RE)?.[2] ?? null;
      evidence.push(`deno.json imports["$fresh/"] = ${fresh1}`);
    }
  }
  preactSpecifier = imports["preact"] ?? null;

  // --- files ---
  const main = await firstExisting(workspace, ["main.ts", "main.tsx", "main.js"]);
  const dev = await firstExisting(workspace, ["dev.ts", "dev.js"]);
  const client = await firstExisting(workspace, ["client.ts", "client.js", "client.tsx"]);
  const manifest = await firstExisting(workspace, ["fresh.gen.ts"]);
  const freshConfig = await firstExisting(workspace, ["fresh.config.ts", "fresh.config.js"]);
  const vite = await firstExisting(workspace, [
    "vite.config.ts",
    "vite.config.js",
    "vite.config.mts",
  ]);
  const utils = await firstExisting(workspace, ["utils.ts"]);

  if (manifest) evidence.push("fresh.gen.ts present (1.x manifest)");
  if (freshConfig) evidence.push(`${freshConfig} present (1.x config)`);
  let viteUsesFresh = false;
  if (vite) {
    const t = (await readText(join(workspace, vite))) ?? "";
    viteUsesFresh = /@fresh\/plugin-vite/.test(t);
    if (viteUsesFresh) evidence.push(`${vite} imports @fresh/plugin-vite`);
  }
  let devUsesBuilder = false;
  let devUsesFresh1 = false;
  if (dev) {
    const t = (await readText(join(workspace, dev))) ?? "";
    devUsesBuilder = /from\s+["']fresh\/dev["']/.test(t) && /Builder/.test(t);
    devUsesFresh1 = /\$fresh\/dev\.ts/.test(t);
    if (devUsesBuilder) evidence.push(`${dev} uses Builder from "fresh/dev" (2.x builder mode)`);
    if (devUsesFresh1) evidence.push(`${dev} imports $fresh/dev.ts`);
  }
  let mainCreatesApp = false;
  let mainStarts1 = false;
  if (main) {
    const t = (await readText(join(workspace, main))) ?? "";
    mainCreatesApp = /new\s+App\b/.test(t) && /from\s+["']fresh["']/.test(t);
    mainStarts1 = /\bstart\s*\(/.test(t) && /\$fresh\/server\.ts/.test(t);
    if (mainCreatesApp) evidence.push(`${main} creates new App() from "fresh"`);
    if (mainStarts1) evidence.push(`${main} calls start(manifest, config) from $fresh/server.ts`);
  }

  // --- directories ---
  const routes = (await isDir(join(workspace, "routes"))) ? "routes" : null;
  const islands = (await isDir(join(workspace, "islands"))) ? "islands" : null;
  const components = (await isDir(join(workspace, "components"))) ? "components" : null;
  const staticDirs: string[] = [];
  if (await isDir(join(workspace, "static"))) staticDirs.push("static");
  const assets = (await isDir(join(workspace, "assets"))) ? "assets" : null;
  if (routes) evidence.push("routes/ directory");
  if (islands) evidence.push("islands/ directory");

  // --- version fallbacks from files when the import map was inconclusive ---
  if (!version) {
    if (manifest || devUsesFresh1 || mainStarts1) version = "1";
    else if (viteUsesFresh || devUsesBuilder || mainCreatesApp) version = "2";
  }

  // --- flavor ---
  if (version === "1") flavor = "1.x-manifest";
  else if (version === "2") {
    if (viteUsesFresh || (imports["@fresh/plugin-vite"] && !devUsesBuilder)) flavor = "2.x-vite";
    else if (devUsesBuilder) flavor = "2.x-builder";
    else flavor = "unknown";
  }

  // --- extra supporting evidence ---
  if (config.lintTags.includes("fresh")) evidence.push('deno.json lint tags include "fresh"');
  if (config.tasks.dev === "vite" || config.tasks.build === "vite build") {
    evidence.push("deno.json tasks use vite");
  }
  if (typeof config.tasks.start === "string" && /_fresh\/server\.js/.test(config.tasks.start)) {
    evidence.push("deno.json start task serves _fresh/server.js");
  }
  if (config.compilerOptions.jsxImportSource === "preact") {
    evidence.push('compilerOptions.jsxImportSource = "preact"');
  }

  // --- workspace members ---
  const apps: string[] = [];
  for (const m of config.workspace) {
    const memberAbs = join(workspace, m);
    if (!(await isDir(memberAbs))) continue;
    try {
      const sub = await detectFresh(memberAbs, undefined);
      if (sub.isFresh) apps.push(m.replace(/^\.\//, "").replace(/\/$/, ""));
    } catch {
      // ignore broken members
    }
  }

  const isFresh = version !== null && (!!routes || !!manifest || mainCreatesApp);
  let confidence: Detection["confidence"] = "low";
  if (isFresh) {
    const strong =
      [freshSpecifier, manifest, viteUsesFresh || devUsesBuilder || mainCreatesApp || mainStarts1]
        .filter(Boolean).length;
    confidence = strong >= 2 ? "high" : strong === 1 && routes ? "medium" : "low";
  }

  return {
    isFresh,
    version,
    flavor,
    freshVersion,
    freshSpecifier,
    preactSpecifier,
    denoConfigPath: config.path,
    dirs: { routes, islands, components, static: staticDirs, assets },
    entry: { main, dev, client, config: freshConfig, utils, manifest, vite },
    confidence,
    evidence,
    apps,
  };
}
