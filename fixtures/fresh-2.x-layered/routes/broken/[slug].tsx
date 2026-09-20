import { define } from "../../utils.ts";

// DEFECT (R007) together with ./[id].tsx.
export default define.page(function BrokenBySlug({ params }) {
  return <p>slug {params.slug}</p>;
});
