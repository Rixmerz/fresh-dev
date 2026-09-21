import { assert, assertEquals } from "@std/assert";
import { detectFresh } from "../core/detect.ts";
import { fixture } from "./_helpers.ts";

Deno.test("detects Fresh 2 Vite, Fresh 2 builder, Fresh 1 manifest and rejects a non-Fresh Deno+Vite app", async () => {
  const cases: [string, boolean, string | null, string][] = [
    ["fresh-2.x-basic", true, "2", "2.x-vite"],
    ["fresh-2.x-layered", true, "2", "2.x-vite"],
    ["fresh-2.x-builder", true, "2", "2.x-builder"],
    ["fresh-1.x-layered", true, "1", "1.x-manifest"],
    ["not-fresh", false, null, "unknown"],
  ];
  for (const [name, isFresh, version, flavor] of cases) {
    const d = await detectFresh(fixture(name));
    assertEquals(d.isFresh, isFresh, `${name} isFresh`);
    assertEquals(d.version, version, `${name} version`);
    assertEquals(d.flavor, flavor, `${name} flavor`);
    if (isFresh) assertEquals(d.confidence, "high", `${name} confidence`);
  }
});

Deno.test("detection reports entries, dirs and evidence", async () => {
  const d = await detectFresh(fixture("fresh-2.x-layered"));
  assertEquals(d.freshVersion, "^2.3.3");
  assertEquals(d.preactSpecifier, "npm:preact@^10.29.1");
  assertEquals(d.entry.main, "main.ts");
  assertEquals(d.entry.vite, "vite.config.ts");
  assertEquals(d.entry.client, "client.ts");
  assertEquals(d.entry.utils, "utils.ts");
  assertEquals(d.entry.manifest, null);
  assertEquals(d.dirs.static, ["static"]);
  assertEquals(d.dirs.assets, "assets");
  assert(d.evidence.some((e) => e.includes("@fresh/update detectFresh2")));
  const one = await detectFresh(fixture("fresh-1.x-layered"));
  assertEquals(one.freshVersion, "1.7.3");
  assertEquals(one.entry.manifest, "fresh.gen.ts");
  assertEquals(one.entry.config, "fresh.config.ts");
  assertEquals(one.entry.dev, "dev.ts");
});
