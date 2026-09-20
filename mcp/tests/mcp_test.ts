import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { fixture } from "./_helpers.ts";

const main = fromFileUrl(new URL("../main.ts", import.meta.url));

/** Drive the stdio server with raw JSON-RPC and collect responses by id. */
async function rpc(
  messages: Record<string, unknown>[],
): Promise<Map<number, Record<string, unknown>>> {
  const cmd = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--allow-read",
      "--allow-env",
      "--allow-run=deno,git",
      "--allow-write",
      "--quiet",
      main,
      "--stdio",
    ],
    stdin: "piped",
    stdout: "piped",
    stderr: "null",
  });
  const child = cmd.spawn();
  const writer = child.stdin.getWriter();
  for (const m of messages) await writer.write(new TextEncoder().encode(JSON.stringify(m) + "\n"));
  await writer.close();
  const out = await child.output();
  const byId = new Map<number, Record<string, unknown>>();
  for (const line of new TextDecoder().decode(out.stdout).split("\n")) {
    if (!line.trim()) continue;
    const msg = JSON.parse(line) as Record<string, unknown>;
    if (typeof msg.id === "number") byId.set(msg.id, msg);
  }
  return byId;
}

Deno.test("mcp: initialize, tools/list, tools/call round-trip over stdio", async () => {
  const ws = fixture("fresh-2.x-basic");
  const res = await rpc([
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test", version: "0" },
      },
    },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "fresh_project", arguments: { workspace: ws } },
    },
    {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "fresh_validate", arguments: { workspace: ws } },
    },
    {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "fresh_routes", arguments: {} },
    },
    {
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: { name: "fresh_project", arguments: { workspace: "/" } },
    },
  ]);
  const tools = (res.get(2)!.result as { tools: { name: string }[] }).tools.map((t) => t.name);
  assertEquals(tools.length, 13);
  for (
    const t of [
      "fresh_project",
      "fresh_routes",
      "fresh_route",
      "fresh_islands",
      "fresh_components",
      "fresh_dependencies",
      "fresh_usages",
      "fresh_impact",
      "fresh_trace",
      "fresh_boundaries",
      "fresh_validate",
      "fresh_graph_export",
      "fresh_reindex",
    ]
  ) {
    assert(tools.includes(t), t);
  }
  const text = (r: Record<string, unknown>) =>
    JSON.parse((r.result as { content: { text: string }[] }).content[0].text);
  const project = text(res.get(3)!);
  assertEquals(project.version, "2");
  assertEquals(project.flavor, "2.x-vite");
  assert(text(res.get(4)!).ok);
  // missing workspace is a validation error, not a crash
  assert((res.get(5)!.result as { isError?: boolean }).isError || res.get(5)!.error);
  const root = text(res.get(6)!);
  assertEquals(root.ok, false);
  assert(String(root.error).includes("filesystem root"));
});
