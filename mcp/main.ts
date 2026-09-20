#!/usr/bin/env -S deno run --allow-read --allow-env --allow-run=deno,git --allow-write
/**
 * fresh-dev MCP server ("fresh"): read-only semantic analysis of Deno Fresh projects.
 * stdio transport; logs go to stderr only.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools/index.ts";
import { VERSION } from "./version.ts";

if (import.meta.main) {
  if (!Deno.args.includes("--stdio")) {
    console.error("fresh-mcp: pass --stdio (the only transport). For the CLI use cli.ts.");
    Deno.exit(2);
  }
  const server = new McpServer(
    { name: "fresh", version: VERSION },
    {
      instructions:
        "Every tool requires `workspace` (absolute Fresh project root). Start with fresh_project. Tools are read-only except fresh_graph_export, which writes only under <workspace>/.fresh-dev/.",
    },
  );
  registerTools(server);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`fresh-mcp ${VERSION} ready (stdio)`);
}
