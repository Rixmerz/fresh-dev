import { define } from "../../utils.ts";

// Route-group layout: scopes a layout to (marketing)/* without touching the URL.
export default define.layout(function MarketingLayout({ Component }) {
  return (
    <div class="marketing">
      <Component />
    </div>
  );
});
