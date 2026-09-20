// DEFECT (R002): no exports at all. Fresh throws
// "Could not find relevant exports in: routes/broken/empty.tsx".
// deno-lint-ignore no-unused-vars
function NotExported() {
  return <p>never registered</p>;
}
