import type { PageProps } from "$fresh/server.ts";

// Route-group layout: scopes a layout to (marketing)/* without touching the URL.
export default function MarketingLayout({ Component }: PageProps) {
  return (
    <div class="marketing">
      <Component />
    </div>
  );
}
