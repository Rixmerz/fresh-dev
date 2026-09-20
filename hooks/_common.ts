/** Shared hook plumbing: stdin JSON, fail-open output, kill switch. */
export interface HookInput {
  hook_event_name?: string;
  session_id?: string;
  cwd?: string;
  tool_name?: string;
  tool_input?: { file_path?: string; command?: string; [k: string]: unknown };
  [k: string]: unknown;
}

export async function readInput(): Promise<HookInput> {
  try {
    const chunks: Uint8Array[] = [];
    for await (const c of Deno.stdin.readable) chunks.push(c);
    const text = new TextDecoder().decode(concat(chunks)).trim();
    return text ? JSON.parse(text) as HookInput : {};
  } catch {
    return {};
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

export function disabled(): boolean {
  const v = (Deno.env.get("FRESH_DEV_HOOKS") ?? "").toLowerCase();
  return v === "off" || v === "0" || v === "false";
}

export function projectDir(input: HookInput): string {
  return Deno.env.get("CLAUDE_PROJECT_DIR") ?? input.cwd ?? Deno.cwd();
}

export function emitContext(event: string, text: string): void {
  console.log(JSON.stringify({
    hookSpecificOutput: { hookEventName: event, additionalContext: { type: "text", text } },
  }));
}

export function relativeTo(dir: string, file: string): string {
  const d = dir.replace(/\/+$/, "") + "/";
  return file.startsWith(d) ? file.slice(d.length) : file;
}
