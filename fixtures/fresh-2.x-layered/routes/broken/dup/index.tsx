import { define } from "../../../utils.ts";

// DEFECT (R006) together with ../dup.tsx: both map to /broken/dup.
export default define.page(function DupIndex() {
  return <p>dup (index)</p>;
});
