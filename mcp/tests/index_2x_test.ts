import { assert, assertEquals } from "@std/assert";
import { loadFixture } from "./_helpers.ts";
import { traceRequest } from "../core/trace.ts";
import { computeImpact } from "../core/impact.ts";
import { validate } from "../validators/index.ts";

const byFile = (idx: Awaited<ReturnType<typeof loadFixture>>, file: string) => {
  const r = idx.routes.find((x) => x.file === file && x.kind !== "programmatic");
  if (!r) throw new Error(`route not found: ${file}`);
  return r;
};

Deno.test("2.x layered: route table (patterns, kinds, methods, config)", async () => {
  const idx = await loadFixture("fresh-2.x-layered");
  const expect: [string, string, string, string[]][] = [
    ["routes/index.tsx", "/", "page", ["GET", "HEAD"]],
    ["routes/blog/[slug].tsx", "/blog/:slug", "page+handler", ["GET", "HEAD"]],
    ["routes/blog/[slug]/comments.ts", "/blog/:slug/comments", "api", ["GET", "POST", "HEAD"]],
    ["routes/docs/[[version]]/index.tsx", "/docs{/:version}?", "page", ["GET", "HEAD"]],
    ["routes/old/[...path].ts", "/legacy/:path*", "api", ["GET", "HEAD"]],
    ["routes/admin/users/[id].tsx", "/admin/users/:id", "page+handler", ["GET", "DELETE", "HEAD"]],
    ["routes/(marketing)/pricing.tsx", "/pricing", "page", ["GET", "HEAD"]],
    ["routes/api/status.ts", "/api/status", "api", ["ALL"]],
    ["routes/partials/menu.tsx", "/partials/menu", "page", ["GET", "HEAD"]],
  ];
  for (const [file, pattern, kind, methods] of expect) {
    const r = byFile(idx, file);
    assertEquals(r.pattern, pattern, file);
    assertEquals(r.kind, kind, file);
    assertEquals(r.methods, methods, file);
  }
  assertEquals(byFile(idx, "routes/old/[...path].ts").filePattern, "/old/:path*");
  assertEquals(byFile(idx, "routes/old/[...path].ts").config?.routeOverride, "/legacy/:path*");
  assertEquals(byFile(idx, "routes/old/[...path].ts").eager, true);
  assertEquals(byFile(idx, "routes/index.tsx").eager, false);
  assertEquals(byFile(idx, "routes/partials/menu.tsx").config?.skipAppWrapper, true);
  assertEquals(byFile(idx, "routes/dashboard.tsx").kind, "page");
  assertEquals(idx.facts.get("routes/dashboard.tsx")?.cssExport, ["./assets/dashboard.css"]);
  assertEquals(byFile(idx, "routes/(marketing)/pricing.tsx").group, "(marketing)");
  // not routes
  assert(!idx.routes.some((r) => r.file.includes("(_components)")));
  assert(!idx.routes.some((r) => r.file.includes("(_islands)")));
  assert(!idx.routes.some((r) => r.file.endsWith("thing_test.ts")));
  assert(!idx.routes.some((r) => r.file.endsWith("notes.mts")));
});

Deno.test("2.x layered: special files and wrappers", async () => {
  const idx = await loadFixture("fresh-2.x-layered");
  assertEquals(byFile(idx, "routes/_app.tsx").kind, "app");
  assertEquals(byFile(idx, "routes/_error.tsx").kind, "error");
  assertEquals(byFile(idx, "routes/_middleware.ts").kind, "middleware");
  assertEquals(byFile(idx, "routes/admin/_middleware.ts").handlerCount, 2);
  assertEquals(byFile(idx, "routes/admin/_layout.tsx").config?.skipInheritedLayouts, true);
  const admin = byFile(idx, "routes/admin/index.tsx");
  assertEquals(admin.layouts, ["routes/admin/_layout.tsx"]);
  assertEquals(admin.app, "routes/_app.tsx");
  const pricing = byFile(idx, "routes/(marketing)/pricing.tsx");
  assertEquals(pricing.layouts, ["routes/_layout.tsx", "routes/(marketing)/_layout.tsx"]);
  const menu = byFile(idx, "routes/partials/menu.tsx");
  assertEquals(menu.layouts, []);
  assertEquals(menu.app, null);
  assertEquals(byFile(idx, "routes/index.tsx").errorRoute, "routes/_error.tsx");
});

Deno.test("2.x layered: programmatic routes and middleware order", async () => {
  const idx = await loadFixture("fresh-2.x-layered");
  const health = idx.routes.find((r) => r.pattern === "/health");
  assert(health && health.kind === "programmatic");
  assertEquals(health.layouts, []);
  assertEquals(
    health.middlewares.length,
    2,
    "staticFiles + logger only (registered before fsRoutes)",
  );
  const cart = idx.routes.find((r) => r.pattern === "/shop/cart");
  assert(cart && cart.kind === "programmatic" && cart.file === "shop/app.ts");
  const adminUsers = byFile(idx, "routes/admin/users/[id].tsx");
  assertEquals(adminUsers.middlewares.length, 5);
  // segment order: root (static, logger, routes/_middleware) then /admin (app.use("/admin"), admin/_middleware)
  assertEquals(adminUsers.middlewares[2], "routes/_middleware.ts");
  assert(adminUsers.middlewares[3].startsWith("app.use(/admin)"));
  assertEquals(adminUsers.middlewares[4], "routes/admin/_middleware.ts");
  const mainFacts = idx.facts.get("main.ts")!;
  assert(mainFacts.callsStaticFiles);
  assert(!mainFacts.appCalls.some((c) => c.method === "listen"));
});

Deno.test("2.x layered: islands, names, props, closure", async () => {
  const idx = await loadFixture("fresh-2.x-layered");
  const names = idx.islands.map((i) => `${i.file}::${i.exportName}=${i.name}`);
  assert(names.includes("islands/LikeButton.tsx::default=LikeButton"));
  assert(names.includes("islands/Comments.tsx::Comments=Comments"));
  assert(
    names.includes("islands/Comments.tsx::default=Comments_1"),
    "UniqueNamer renames the default export",
  );
  assert(names.includes("routes/(marketing)/(_islands)/PlanToggle.tsx::PlanToggle=PlanToggle"));
  const empty = idx.islands.find((i) => i.file === "islands/Empty.ts");
  assertEquals(empty?.exportName, "(none)");
  const bad = idx.islands.find((i) => i.file === "islands/BadProps.tsx")!;
  assertEquals(bad.props.find((p) => p.name === "onSave")?.serializable, "no");
  assertEquals(bad.props.find((p) => p.name === "createdAt")?.serializable, "yes");
  const comments = idx.islands.find((i) => i.file === "islands/Comments.tsx")!;
  assertEquals(comments.clientClosure.sort(), ["components/Avatar.tsx", "lib/format.ts"]);
  const leaky = idx.islands.find((i) => i.file === "islands/Leaky.tsx")!;
  assertEquals(leaky.violations.length, 1);
  assertEquals(leaky.violations[0].chain, ["islands/Leaky.tsx", "lib/db.ts"]);
  const like = idx.islands.find((i) => i.file === "islands/LikeButton.tsx")!;
  assertEquals(like.usedBy.sort(), ["routes/barrel-user.tsx", "routes/index.tsx"]);
});

Deno.test("2.x layered: components, usages and boundaries", async () => {
  const idx = await loadFixture("fresh-2.x-layered");
  const comp = (f: string) => idx.components.find((c) => c.file === f)!;
  assertEquals(comp("components/Hero.tsx").usedBy, ["routes/index.tsx"]);
  assertEquals(comp("components/Footer.tsx").usedBy, []);
  assertEquals(comp("components/Avatar.tsx").boundary, "shared");
  assert(comp("components/Avatar.tsx").reachableFromIslands);
  assertEquals(comp("routes/(marketing)/(_components)/PricingTable.tsx").usedBy, [
    "routes/(marketing)/pricing.tsx",
  ]);
  const db = idx.boundaries.get("lib/db.ts")!;
  assertEquals(db.nature, "server-only");
  assertEquals(db.reachableFrom, ["islands/Leaky.tsx"]);
  assertEquals(idx.boundaries.get("lib/browser-only.ts")?.nature, "browser-only");
  assertEquals(idx.boundaries.get("lib/format.ts")?.nature, "isomorphic");
  assertEquals(idx.boundaries.get("client.ts")?.boundary, "client-entry");
  assertEquals(idx.boundaries.get("routes/index.tsx")?.boundary, "server");
  assertEquals(idx.violations.filter((v) => v.id === "B001").length, 1);
  assertEquals(idx.violations.filter((v) => v.id === "B002").map((v) => v.file), [
    "routes/uses-window.tsx",
  ]);
  assertEquals(idx.graph.unresolved, []);
});

Deno.test("2.x layered: traces", async () => {
  const idx = await loadFixture("fresh-2.x-layered");
  const t = async (path: string, method = "GET") => await traceRequest(idx, path, method);
  const home = await t("/");
  assertEquals(home.matched?.route.file, "routes/index.tsx");
  assertEquals(home.chain.map((c) => c.step), [
    "app",
    "middleware",
    "middleware",
    "middleware",
    "layout",
    "page",
  ]);
  assertEquals(home.islands, ["islands/LikeButton.tsx"]);
  const blog = await t("/blog/hello");
  assertEquals(blog.matched?.params, { slug: "hello" });
  assertEquals(blog.islands, ["islands/Comments.tsx"]);
  const put = await t("/blog/hello/comments", "PUT");
  assertEquals(put.matched?.methodAllowed, false);
  const docs = await t("/docs");
  assertEquals(docs.matched?.route.file, "routes/docs/[[version]]/index.tsx");
  assertEquals((await t("/docs/v2")).matched?.params, { version: "v2" });
  assertEquals((await t("/legacy/a/b")).matched?.params, { path: "a/b" });
  assertEquals((await t("/old/a/b")).matched, null);
  assertEquals((await t("/old/a/b")).notFound?.file, "routes/_error.tsx");
  const admin = await t("/admin");
  assertEquals(admin.chain.filter((c) => c.step === "layout").map((c) => c.file), [
    "routes/admin/_layout.tsx",
  ]);
  assertEquals(admin.chain.filter((c) => c.step === "middleware").length, 5);
  const menu = await t("/partials/menu");
  assert(!menu.chain.some((c) => c.step === "app" || c.step === "layout"));
  const health = await t("/health");
  assertEquals(health.matched?.route.kind, "programmatic");
  assertEquals(health.chain.filter((c) => c.step === "middleware").length, 2);
  assertEquals((await t("/shop/cart")).matched?.route.file, "shop/app.ts");
  const logo = await t("/logo.svg");
  assertEquals(logo.staticMatch?.file, "static/logo.svg");
  assertEquals(logo.notFound, null);
  const nope = await t("/nope");
  assertEquals(nope.matched, null);
  assertEquals(nope.notFound?.file, "routes/_error.tsx");
  const dup = await t("/broken/dup");
  assertEquals(dup.candidates.length, 4, "two static duplicates + [id] + [slug]");
  assertEquals(dup.candidates.slice(0, 2).map((c) => c.file).sort(), [
    "routes/broken/dup.tsx",
    "routes/broken/dup/index.tsx",
  ], "static patterns win");
});

Deno.test("2.x layered: validator findings — must report and must not report", async () => {
  const idx = await loadFixture("fresh-2.x-layered");
  const r = await validate(idx);
  const has = (id: string, file: string) => r.findings.some((f) => f.id === id && f.file === file);
  const must: [string, string][] = [
    ["R002", "routes/broken/empty.tsx"],
    ["R006", "routes/broken/dup.tsx"],
    ["R006", "routes/broken/dup/index.tsx"],
    ["R007", "routes/broken/[id].tsx"],
    ["R012", "routes/broken/old-style.ts"],
    ["R014", "routes/legacy-mw/_middleware.ts"],
    ["R018", "routes/broken/notes.mts"],
    ["R019", "routes/broken/thing_test.ts"],
    ["I001", "islands/Empty.ts"],
    ["I002", "islands/BadProps.tsx"],
    ["B001", "lib/db.ts"],
    ["I004", "components/ClickyCard.tsx"],
    ["I005", "routes/barrel-user.tsx"],
    ["I008", "islands/NoGuard.tsx"],
    ["B002", "routes/uses-window.tsx"],
  ];
  for (const [id, file] of must) assert(has(id, file), `expected ${id} on ${file}`);
  const mustNot = [
    "R013",
    "D001",
    "D002",
    "D003",
    "D004",
    "R017",
    "R020",
    "R016",
    "C002",
    "R005",
    "R009",
    "R015",
    "R011",
    "I007",
    "B003",
    "C007",
    "C009",
    "R001",
  ];
  for (const id of mustNot) {
    assert(
      !r.findings.some((f) => f.id === id),
      `unexpected ${id}: ${JSON.stringify(r.findings.filter((f) => f.id === id))}`,
    );
  }
  assertEquals(r.findings.filter((f) => f.id === "I002").length, 1, "only onSave, not createdAt");
  assert(!r.ok);
  assert(r.summary.errors >= 9);
  assertEquals(r.summary.unverified, []);
  // file-scoped run only reports that file
  const scoped = await validate(idx, { files: ["islands/BadProps.tsx"] });
  assert(scoped.findings.every((f) => f.file === "islands/BadProps.tsx"));
});

Deno.test("2.x layered: impact of a component change reaches routes and islands", async () => {
  const idx = await loadFixture("fresh-2.x-layered");
  const r = computeImpact(idx, ["components/Avatar.tsx"]);
  assert(r.islands.some((i) => i.file === "islands/Comments.tsx"));
  assert(r.routes.some((x) => x.file === "routes/blog/[slug].tsx"));
  const mw = computeImpact(idx, ["routes/admin/_middleware.ts"]);
  assert(
    mw.wrappers.some((w) => w.file === "routes/admin/_middleware.ts" && w.routesUnderScope === 2),
  );
  assert(mw.routes.some((x) => x.file === "routes/admin/users/[id].tsx"));
  const cfg = computeImpact(idx, ["deno.json"]);
  assert(cfg.configChanges.length === 1);
  const db = computeImpact(idx, ["lib/db.ts"]);
  assertEquals(db.boundaryRisks.length, 1);
  assert(db.suggestedChecks.some((c) => c.startsWith("deno check")));
});

Deno.test("2.x basic: the official template is clean (no false positives) and useSignal in a route is allowed", async () => {
  const idx = await loadFixture("fresh-2.x-basic");
  const r = await validate(idx);
  assertEquals(r.findings.filter((f) => f.severity === "error"), []);
  assert(r.ok);
});

Deno.test("2.x builder flavor indexes like Vite mode", async () => {
  const idx = await loadFixture("fresh-2.x-builder");
  assertEquals(idx.detection.flavor, "2.x-builder");
  assert(idx.routes.some((r) => r.pattern === "/api/:name"));
  assertEquals(idx.islands.length, 1);
});
