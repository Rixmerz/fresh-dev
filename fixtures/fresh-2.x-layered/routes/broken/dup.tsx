import { define } from "../../utils.ts";

// DEFECT (R006) together with ./dup/index.tsx: both map to /broken/dup.
export default define.page(function Dup() {
  return <p>dup (file)</p>;
});
