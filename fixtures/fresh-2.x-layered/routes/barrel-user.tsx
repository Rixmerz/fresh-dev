import { define } from "../utils.ts";
// DEFECT (I005): island consumed through a barrel (components/Barrel.ts) instead
// of a direct import from islands/. Attribution route → island is `inferred`.
import { LikeButton } from "../components/Barrel.ts";

export default define.page(function BarrelUser() {
  return <LikeButton postId="barrel" initial={1} />;
});
