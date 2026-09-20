import { define } from "../../utils.ts";

// Plain page that sits under the invalid legacy-mw/_middleware.ts scope.
export default define.page(function LegacyMw() {
  return <p>legacy middleware scope</p>;
});
