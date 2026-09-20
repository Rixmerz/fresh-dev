// R019 (info): matches the test-file pattern /[._]test\.(?:[tj]sx?|[mc][tj]s)$/
// and is ignored by the crawler by design.
Deno.test("thing", () => {
  const sum = [1, 1].reduce((a, b) => a + b, 0);
  if (sum !== 2) throw new Error("math is broken");
});
