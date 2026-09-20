#!/usr/bin/env -S deno run --allow-read --allow-env --allow-write --allow-run=deno,git
/**
 * PostToolUse hook on Edit/Write under routes/, islands/, components/: run the fast structural
 * rules for that one file and hand back at most 8 lines. Feedback only — never blocks.
 */
import { ProjectIndex, validateWorkspace } from "../mcp/core/index.ts";
import { validate } from "../mcp/validators/index.ts";
import { disabled, emitContext, projectDir, readInput, relativeTo } from "./_common.ts";

async function main() {
  const input = await readInput();
  if (disabled()) return;
  const fp = input.tool_input?.file_path;
  if (typeof fp !== "string") return;
  const dir = projectDir(input);
  const rel = relativeTo(dir, fp);
  if (!/^(routes|islands|components)\/.*\.(tsx?|jsx?)$/.test(rel)) return;
  let ws: string;
  try {
    ws = await validateWorkspace(dir);
  } catch {
    return;
  }
  const idx = await ProjectIndex.load(ws, { force: false });
  if (!idx.detection.isFresh) return;
  const r = await validate(idx, {
    files: [rel],
    fast: true,
    categories: ["routes", "islands", "boundaries", "dependencies"],
  });
  // B001 findings whose chain starts at the edited island are already included by the rule
  const relevant = r.findings.filter((f) => f.severity !== "info");
  const lines = relevant.slice(0, 8).map((f) =>
    `${f.id} ${f.file}:${f.line ?? "-"} ${f.message}${f.hint ? ` (hint: ${f.hint})` : ""}`
  );
  if (lines.length === 0) return;
  // keep an audit trail for /fresh-dev:validate --warnings style review
  try {
    await Deno.mkdir(`${ws}/.fresh-dev`, { recursive: true });
    await Deno.writeTextFile(
      `${ws}/.fresh-dev/warnings.jsonl`,
      JSON.stringify({
        at: new Date().toISOString(),
        file: rel,
        findings: relevant.map((f) => f.id),
      }) + "\n",
      { append: true },
    );
  } catch { /* ignore */ }
  emitContext(
    "PostToolUse",
    `[fresh-dev] ${rel}:\n${lines.slice(0, 8).map((l) => "- " + l).join("\n")}`,
  );
}

try {
  await main();
} catch {
  // fail open
}
