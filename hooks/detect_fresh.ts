#!/usr/bin/env -S deno run --allow-read --allow-env
/**
 * SessionStart / CwdChanged / DirectoryAdded hook: say (once, briefly) that this is a Fresh
 * project and how to work in it. Silent when it is not. Never fails the session.
 */
import { detectFresh } from "../mcp/core/detect.ts";
import { readDenoConfig } from "../mcp/core/config.ts";
import { disabled, emitContext, projectDir, readInput } from "./_common.ts";

async function main() {
  const input = await readInput();
  if (disabled()) return;
  const dir = projectDir(input);
  const config = await readDenoConfig(dir);
  if (!config.path) return;
  const d = await detectFresh(dir, config);
  if (!d.isFresh) return;
  let indexNote = "index: not built yet (first fresh_* call builds it)";
  try {
    const st = await Deno.stat(`${dir}/.fresh-dev/index.json`);
    const age = Math.round((Date.now() - (st.mtime?.getTime() ?? Date.now())) / 60000);
    indexNote = `index cache: .fresh-dev/index.json (${age} min old)`;
  } catch { /* no cache */ }
  const lines = [
    `[fresh-dev] Deno Fresh ${d.version} project (${d.flavor}${
      d.freshVersion ? `, ${d.freshVersion}` : ""
    }) at ${dir}. ${indexNote}.`,
    `- Use the fresh MCP tools with workspace="${dir}" (required on every call): fresh_project first, then fresh_routes / fresh_route / fresh_islands / fresh_trace / fresh_impact / fresh_validate.`,
    "- Before editing under routes/, islands/ or components/, load the fresh-dev:fresh-development skill (the routing/islands/middleware skills load by path).",
    '- When briefing a vise subagent (vise:frontend, vise:backend-typescript), name the skill in the brief: "Load the fresh-dev:fresh-islands skill before your first edit" and paste fresh_route/fresh_impact facts as path:line — subagents do not load plugin skills on their own.',
    "- Types and references: deno lsp (never typescript-language-server). Errors: `deno check`, `deno lint` (fresh tag) or fresh_validate(external).",
  ];
  if (d.apps.length) {
    lines.push(
      `- Deno workspace members that are Fresh apps: ${
        d.apps.join(", ")
      } — pass the app directory as workspace.`,
    );
  }
  emitContext(input.hook_event_name ?? "SessionStart", lines.join("\n"));
}

try {
  await main();
} catch {
  // fail open
}
