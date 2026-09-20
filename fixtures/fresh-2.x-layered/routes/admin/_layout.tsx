import type { LayoutConfig } from "fresh";
import { define } from "../../utils.ts";

// Resets the inherited layout chain: /admin/* renders with ONLY this layout.
export const config: LayoutConfig = { skipInheritedLayouts: true };

export default define.layout(function AdminLayout({ Component, state }) {
  return (
    <div class="admin">
      <aside>{state.user}</aside>
      <Component />
    </div>
  );
});
