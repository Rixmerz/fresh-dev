import { define } from "../utils.ts";

// DEFECT (B002): a route (server-only) reads `window.location` with no guard.
export default define.page(function UsesWindow() {
  const here = window.location.href;
  return <p>You are at {here}</p>;
});
