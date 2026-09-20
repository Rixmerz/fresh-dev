import { assertEquals, assertThrows } from "@std/assert";
import { manifestIdentifier, pathToPattern, sortRoutePaths } from "../core/routes.ts";
import {
  pathToExportName,
  sanitizeIslandName1,
  serializability,
  stringToIdentifier,
  UniqueNamer,
} from "../core/islands.ts";

Deno.test("pathToPattern matches the documented Fresh table", () => {
  const cases: [string, string][] = [
    ["index", "/"],
    ["about", "/about"],
    ["blog/index", "/blog"],
    ["blog/[slug]", "/blog/:slug"],
    ["blog/[slug]/comments", "/blog/:slug/comments"],
    ["old/[...path]", "/old/:path*"],
    ["docs/[[version]]/index", "/docs{/:version}?"],
    ["[[name]]", "/{:name}?"],
    ["(marketing)/pricing", "/pricing"],
    ["shop/[id]-asdf", "/shop/:id-asdf"],
    ["x/asdf[bar]", "/x/asdf:bar"],
    ["x/[id]@[bar]", "/x/:id@:bar"],
  ];
  for (const [input, expected] of cases) {
    assertEquals(pathToPattern(input).pattern, expected, input);
  }
  assertEquals(
    pathToPattern("(marketing)/pricing", { keepGroups: true }).pattern,
    "/(marketing)/pricing",
  );
  assertEquals(pathToPattern("old/[...path]").catchAll, true);
  assertEquals(pathToPattern("docs/[[version]]/index").optional, true);
  assertEquals(pathToPattern("blog/[slug]").params, ["slug"]);
  assertThrows(() => pathToPattern("x/[id][bar]"), SyntaxError);
});

Deno.test("sortRoutePaths: _app first, then middleware, specials, index, literal, param, catch-all", () => {
  const ids = [
    "/blog/[slug]",
    "/blog/index",
    "/_app",
    "/blog/_middleware",
    "/blog/[...rest]",
    "/blog/new",
    "/_middleware",
  ];
  const sorted2 = [...ids].sort((a, b) => sortRoutePaths(a, b, "2"));
  assertEquals(sorted2, [
    "/_app",
    "/_middleware",
    "/blog/_middleware",
    "/blog/index",
    "/blog/new",
    "/blog/[slug]",
    "/blog/[...rest]",
  ]);
  const sorted1 = [...ids].sort((a, b) => sortRoutePaths(a, b, "1"));
  assertEquals(sorted1[0], "/_app");
  assertEquals(sorted1[sorted1.length - 1], "/blog/[...rest]");
});

Deno.test("fresh.gen.ts identifiers follow specifierToIdentifier", () => {
  assertEquals(manifestIdentifier("./routes/blog/[slug].tsx"), "$blog_slug_");
  assertEquals(manifestIdentifier("./routes/api/joke.ts"), "$api_joke");
  assertEquals(manifestIdentifier("./islands/Counter.tsx"), "$Counter");
});

Deno.test("island naming: 1.x sanitizeIslandName and 2.x UniqueNamer", () => {
  assertEquals(
    stringToIdentifier("(marketing)/(_islands)/PlanToggle"),
    "_marketing_islands_PlanToggle",
  );
  assertEquals(sanitizeIslandName1("widgets/Clock.tsx"), "Widgets_Clock");
  assertEquals(
    sanitizeIslandName1("routes/(marketing)/(_islands)/PlanToggle.tsx"),
    "Routes_marketing_islands_PlanToggle",
  );
  assertEquals(pathToExportName("islands/my-island.tsx"), "my_island");
  const n = new UniqueNamer();
  assertEquals(n.getUniqueName("Comments"), "Comments");
  assertEquals(n.getUniqueName("Comments"), "Comments_1");
  assertEquals(n.getUniqueName("Comments"), "Comments_2");
});

Deno.test("prop serializability per version", () => {
  assertEquals(serializability("() => void", "onSave", "2").serializable, "no");
  assertEquals(serializability("Date", "createdAt", "2").serializable, "yes");
  assertEquals(serializability("Date", "createdAt", "1").serializable, "no");
  assertEquals(serializability("Signal<number>", "count", "1").serializable, "yes");
  assertEquals(serializability("ComponentChildren", "children", "1").serializable, "yes");
  assertEquals(serializability("ComponentChildren", "header", "1").serializable, "no");
  assertEquals(serializability("ComponentChildren", "header", "2").serializable, "yes");
  assertEquals(serializability("string | number", "x", "2").serializable, "yes");
  assertEquals(serializability("Promise<string>", "x", "2").serializable, "no");
  assertEquals(serializability("UserModel", "x", "2").serializable, "unknown");
});
