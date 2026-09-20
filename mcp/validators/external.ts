/** Optional `deno lint --json` / `deno check` merge (plan §5 notes, C008). */
import type { Finding } from "../core/types.ts";
import type { ProjectIndex } from "../core/index.ts";

async function run(
  args: string[],
  cwd: string,
  timeoutMs = 120_000,
): Promise<{ code: number; stdout: string; stderr: string } | null> {
  try {
    const cmd = new Deno.Command("deno", { args, cwd, stdout: "piped", stderr: "piped" });
    const child = cmd.spawn();
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch { /* already exited */ }
    }, timeoutMs);
    const out = await child.output();
    clearTimeout(timer);
    return {
      code: out.code,
      stdout: new TextDecoder().decode(out.stdout),
      stderr: new TextDecoder().decode(out.stderr),
    };
  } catch {
    return null;
  }
}

export async function runDenoLint(
  index: ProjectIndex,
  files: string[] | null,
): Promise<{ findings: Finding[]; unverified: string | null }> {
  const args = ["lint", "--json", ...(files && files.length ? files : ["."])];
  const res = await run(args, index.workspace);
  if (!res) return { findings: [], unverified: "deno lint: deno is not on PATH" };
  const findings: Finding[] = [];
  try {
    const json = JSON.parse(res.stdout) as {
      diagnostics?: {
        filename: string;
        range?: { start?: { line: number; col: number } };
        code: string;
        message: string;
        hint?: string;
      }[];
      errors?: { file_path?: string; message: string }[];
    };
    for (const d of json.diagnostics ?? []) {
      const file = d.filename.replace(/^file:\/\//, "").replace(index.workspace + "/", "");
      const isHandlerExport2 = d.code === "fresh-handler-export" && index.version === "2";
      findings.push({
        id: isHandlerExport2 ? "C008" : `lint:${d.code}`,
        severity: isHandlerExport2
          ? "info"
          : d.code === "fresh-server-event-handlers"
          ? "error"
          : "warning",
        category: d.code.startsWith("fresh") ? "conventions" : "conventions",
        file,
        line: d.range?.start?.line ?? null,
        message: isHandlerExport2
          ? `deno lint reports fresh-handler-export, but Fresh 2 accepts (and prefers) \`handlers\`; treat as a false positive`
          : `[${d.code}] ${d.message}`,
        hint: d.hint ?? null,
        confidence: "extracted",
        source: "deno lint",
      });
    }
    for (const e of json.errors ?? []) {
      findings.push({
        id: "lint:error",
        severity: "error",
        category: "conventions",
        file: e.file_path?.replace(index.workspace + "/", "") ?? "(deno lint)",
        line: null,
        message: e.message,
        hint: null,
        confidence: "extracted",
        source: "deno lint",
      });
    }
  } catch {
    return {
      findings,
      unverified: `deno lint: could not parse output (${res.stderr.trim().slice(0, 200)})`,
    };
  }
  return { findings, unverified: null };
}

export async function runDenoCheck(
  index: ProjectIndex,
  files: string[] | null,
): Promise<{ findings: Finding[]; unverified: string | null }> {
  let targets: string[];
  if (files && files.length) targets = files;
  else if (index.version === "2") targets = [];
  else {targets = [index.detection.entry.main ?? "main.ts", index.detection.entry.dev ?? "dev.ts"]
      .filter((f) => index.files.has(f));}
  const res = await run(["check", ...targets], index.workspace, 180_000);
  if (!res) return { findings: [], unverified: "deno check: deno is not on PATH" };
  const findings: Finding[] = [];
  const text = res.stderr + "\n" + res.stdout;
  const re = /^(TS\d+) \[ERROR\]: ([\s\S]*?)\n\s+at file:\/\/(.+?):(\d+):(\d+)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    findings.push({
      id: `check:${m[1]}`,
      severity: "error",
      category: "dependencies",
      file: m[3].replace(index.workspace + "/", ""),
      line: Number(m[4]),
      message: m[2].split("\n")[0].trim(),
      hint: null,
      confidence: "extracted",
      source: "deno check",
    });
  }
  if (res.code !== 0 && findings.length === 0) {
    return {
      findings,
      unverified: `deno check exited ${res.code}: ${
        text.trim().split("\n").slice(-3).join(" | ").slice(0, 300)
      }`,
    };
  }
  return { findings, unverified: null };
}
