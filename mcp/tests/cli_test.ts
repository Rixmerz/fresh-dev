import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { fixture } from "./_helpers.ts";

const cli = fromFileUrl(new URL("../cli.ts", import.meta.url));

async function run(args: string[]): Promise<{ code: number; stdout: string }> {
  const out = await new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--allow-read",
      "--allow-env",
      "--allow-run=deno,git",
      "--allow-write",
      "--quiet",
      cli,
      ...args,
    ],
    stdout: "piped",
    stderr: "piped",
  }).output();
  return { code: out.code, stdout: new TextDecoder().decode(out.stdout) };
}

Deno.test("cli: validate exit codes 0 / 1 / 2", async () => {
  assertEquals((await run(["validate", fixture("fresh-2.x-basic")])).code, 0);
  assertEquals((await run(["validate", fixture("fresh-2.x-layered"), "--json"])).code, 1);
  assertEquals((await run(["validate", fixture("not-fresh")])).code, 2);
});

Deno.test("cli: --json output is machine readable", async () => {
  const r = await run(["routes", fixture("fresh-2.x-basic"), "--json"]);
  const doc = JSON.parse(r.stdout) as { ok: boolean; routes: { pattern: string | null }[] };
  assert(doc.ok);
  assert(doc.routes.some((x) => x.pattern === "/api/:name"));
  const rules = JSON.parse((await run(["rules", "--json"])).stdout) as { id: string }[];
  assert(rules.length >= 35);
});
