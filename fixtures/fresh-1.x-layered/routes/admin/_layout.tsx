import type { LayoutConfig, PageProps } from "$fresh/server.ts";

// Resets the inherited layout chain: /admin/* renders with ONLY this layout.
export const config: LayoutConfig = { skipInheritedLayouts: true };

export default function AdminLayout({ Component, state }: PageProps) {
  return (
    <div class="admin">
      <aside>{String(state.user ?? "")}</aside>
      <Component />
    </div>
  );
}
