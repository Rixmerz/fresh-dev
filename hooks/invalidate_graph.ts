#!/usr/bin/env -S deno run --allow-read --allow-env --allow-write
/**
 * PostToolUse / FileChanged hook: record the touched path in <project>/.fresh-dev/dirty.json so the
 * next fresh_* call re-parses it even if mtimes are unreliable. Cheap; never blocks.
 */
import { disabled, projectDir, readInput, relativeTo } from "./_common.ts";

const GIT_RE = /\bgit\s+(checkout|switch|pull|merge|stash|rebase|reset)\b|deno\s+task\s+manifest/;

async function main() {
  const input = await readInput();
  if (disabled()) return;
  const dir = projectDir(input);
  const paths: string[] = [];
  const fp = input.tool_input?.file_path;
  if (typeof fp === "string") paths.push(relativeTo(dir, fp));
  const cmd = input.tool_input?.command;
  if (Deno.args.includes("--from-bash")) {
    if (typeof cmd !== "string" || !GIT_RE.test(cmd)) return;
    paths.push("*");
  }
  if (input.hook_event_name === "FileChanged" && typeof input.file_path === "string") {
    paths.push(relativeTo(dir, input.file_path));
  }
  if (paths.length === 0) return;
  // only bother for Fresh-relevant files
  const relevant = paths.some((p) =>
    p === "*" || /^(routes|islands|components)\//.test(p) ||
    /(^|\/)(deno\.jsonc?|fresh\.gen\.ts|vite\.config\.ts|main\.ts|dev\.ts|client\.ts|utils\.ts)$/
      .test(p)
  );
  if (!relevant) return;
  const markerDir = `${dir}/.fresh-dev`;
  await Deno.mkdir(markerDir, { recursive: true });
  const file = `${markerDir}/dirty.json`;
  let existing: string[] = [];
  try {
    existing = (JSON.parse(await Deno.readTextFile(file)) as { paths?: string[] }).paths ?? [];
  } catch { /* none */ }
  const merged = [...new Set([...existing, ...paths])];
  await Deno.writeTextFile(file, JSON.stringify({ paths: merged, at: new Date().toISOString() }));
}

try {
  await main();
} catch {
  // fail open
}
