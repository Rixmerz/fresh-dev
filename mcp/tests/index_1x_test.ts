import { assert, assertEquals } from "@std/assert";
import { loadFixture } from "./_helpers.ts";
import { traceRequest } from "../core/trace.ts";
import { validate } from "../validators/index.ts";
import { exportGraph } from "../core/export.ts";

Deno.test("1.x layered: routes, manifest cross-check, wrappers", async () => {
  const idx = await loadFixture("fresh-1.x-layered");
  const byFile = (f: string) => idx.routes.find((r) => r.file === f)!;
  assertEquals(byFile("routes/blog/[slug].tsx").kind, "page+handler");
  assertEquals(byFile("routes/api/joke.ts").methods, ["ALL"]);
  assertEquals(byFile("routes/old/[...path].ts").pattern, "/legacy/:path*");
  assertEquals(byFile("routes/docs/[[version]]/index.tsx").pattern, "/docs{/:version}?");
  assertEquals(byFile("routes/(marketing)/pricing.tsx").layouts, [
    "routes/_layout.tsx",
    "routes/(marketing)/_layout.tsx",
  ]);
  assertEquals(byFile("routes/admin/index.tsx").layouts, ["routes/admin/_layout.tsx"]);
  assertEquals(byFile("routes/admin/index.tsx").middlewares, [
    "routes/_middleware.ts",
    "routes/admin/_middleware.ts",
  ]);
  assertEquals(byFile("routes/_404.tsx").kind, "notFound");
  assertEquals(byFile("routes/_500.tsx").kind, "error");
  assert(!idx.routes.some((r) => r.file.endsWith("_error.tsx")));
  assertEquals(idx.manifest?.routes.length, 17);
  assertEquals(idx.manifest?.islands.length, 6);
  assert(idx.manifest?.routes.includes("routes/ghost.tsx"));
  assert(!idx.manifest?.routes.includes("routes/about.tsx"));
});

Deno.test("1.x layered: island names and runtime ids", async () => {
  const idx = await loadFixture("fresh-1.x-layered");
  const find = (file: string, exp: string) =>
    idx.islands.find((i) => i.file === file && i.exportName === exp)!;
  assertEquals(find("islands/LikeButton.tsx", "default").name, "LikeButton");
  assertEquals(find("islands/LikeButton.tsx", "default").islandId, "likebutton_default");
  assertEquals(find("islands/Comments.tsx", "Comments").islandId, "comments_comments");
  assertEquals(find("islands/Comments.tsx", "default").islandId, "comments_default");
  assertEquals(find("islands/widgets/Clock.tsx", "default").name, "Widgets_Clock");
  assertEquals(find("islands/widgets/Clock.tsx", "default").islandId, "widgets_clock_default");
  assertEquals(
    find("routes/(marketing)/(_islands)/PlanToggle.tsx", "PlanToggle").name,
    "Routes_marketing_islands_PlanToggle",
  );
  assert(find("islands/widgets/Clock.tsx", "default").hooks.includes("useEffect"));
  assertEquals(
    find("islands/DateProp.tsx", "default").props.find((p) => p.name === "publishedAt")
      ?.serializable,
    "no",
  );
});

Deno.test("1.x layered: validator findings", async () => {
  const idx = await loadFixture("fresh-1.x-layered");
  const r = await validate(idx);
  const has = (id: string, file: string) => r.findings.some((f) => f.id === id && f.file === file);
  for (
    const [id, file] of [
      ["R008", "fresh.gen.ts"],
      ["D001", "fresh.gen.ts"],
      ["R013", "routes/broken/handlers-export.ts"],
      ["I002", "islands/DateProp.tsx"],
      ["B001", "lib/db.ts"],
      ["I004", "components/ClickyCard.tsx"],
      ["C003", "static/styles.css"],
    ] as const
  ) {
    assert(has(id, file), `expected ${id} on ${file}`);
  }
  assertEquals(
    r.findings.filter((f) => f.id === "R008").length,
    2,
    "about.tsx missing from manifest + ghost.tsx missing on disk",
  );
  for (
    const id of [
      "R012",
      "R014",
      "R002",
      "R006",
      "R007",
      "R018",
      "R009",
      "R011",
      "R005",
      "R016",
      "C002",
      "I001",
      "I007",
      "I008",
      "B003",
      "B002",
      "D003",
      "D004",
      "D005",
      "C007",
    ]
  ) {
    assert(!r.findings.some((f) => f.id === id), `unexpected ${id}`);
  }
  // C003 must only complain about styles.css here (config, globs and deps are fine)
  assertEquals(r.findings.filter((f) => f.id === "C003").map((f) => f.file), ["static/styles.css"]);
  assert(!r.ok);
});

Deno.test("1.x layered: traces (static wins, 405, 404)", async () => {
  const idx = await loadFixture("fresh-1.x-layered");
  const css = await traceRequest(idx, "/styles.css");
  assertEquals(css.staticMatch?.servedBeforeRoutes, true);
  const post = await traceRequest(idx, "/blog/hello", "POST");
  assertEquals(post.matched?.methodAllowed, false);
  const nope = await traceRequest(idx, "/nope");
  assertEquals(nope.notFound?.file, "routes/_404.tsx");
  const admin = await traceRequest(idx, "/admin");
  assertEquals(admin.chain.filter((c) => c.step === "middleware").map((c) => c.file), [
    "routes/_middleware.ts",
    "routes/admin/_middleware.ts",
  ]);
});

Deno.test("graph export writes Graphify-compatible node-link JSON that livespec can map", async () => {
  const idx = await loadFixture("fresh-2.x-layered");
  const r = await exportGraph(idx);
  const doc = JSON.parse(await Deno.readTextFile(`${idx.workspace}/${r.path}`)) as {
    directed: boolean;
    nodes: Record<string, unknown>[];
    links: Record<string, unknown>[];
  };
  assertEquals(doc.directed, true);
  assert(doc.nodes.length > 10);
  for (const n of doc.nodes) {
    assert(
      typeof n.id === "string" && typeof n.label === "string" && typeof n.source_file === "string",
    );
    assert(/^L\d+$/.test(n.source_location as string));
  }
  const rel = new Set(doc.links.map((l) => l.relation));
  assert(rel.has("uses_component"));
  assert(rel.has("uses"));
  assert(doc.links.every((l) => l.confidence === "EXTRACTED" || l.confidence === "INFERRED"));
  assert(doc.links.every((l) => (l.confidence_score as number) <= 0.9));
  // a named default export keeps its function name as label
  assert(doc.nodes.some((n) => n.id === "routes/blog/[slug].tsx::Post"));
  assert(
    doc.links.some((l) =>
      l.source === "routes/blog/[slug].tsx::Post" &&
      l.target === "components/PostBody.tsx::PostBody" && l.relation === "uses_component"
    ),
  );
  await Deno.remove(`${idx.workspace}/.fresh-dev`, { recursive: true });
});

Deno.test("legacy 1.x example apps index without errors", async () => {
  for (
    const app of [
      "cafe-artesanal",
      "ciberseguridad-landing",
      "frutas-frescas",
      "joyeria-elegante",
      "joyeria-landing",
      "perfume-luxe",
    ]
  ) {
    const idx = await loadFixture(`fresh-1.x/${app}`);
    assertEquals(idx.detection.version, "1", app);
    assert(idx.routes.some((r) => r.kind === "app"), app);
    const r = await validate(idx);
    assertEquals(r.summary.unverified, [], app);
    assert(r.findings.every((f) => f.id !== "R008"), `${app}: manifest in sync`);
  }
});
