import { define } from "../../utils.ts";

// DEFECT (R007) together with ./[slug].tsx: two sibling dynamic segments with
// different names → both produce /broken/:x and match order is undefined.
export default define.page(function BrokenById({ params }) {
  return <p>id {params.id}</p>;
});
