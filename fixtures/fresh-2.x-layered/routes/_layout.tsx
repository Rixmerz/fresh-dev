import { define } from "../utils.ts";
import { Nav } from "../components/Nav.tsx";

// Root layout: wraps every page except those that skip inherited layouts
// (routes/admin/* via admin/_layout.tsx config, routes/partials/menu.tsx via route config).
export default define.layout(function RootLayout({ Component, state }) {
  return (
    <div class="site">
      <Nav user={state.user} />
      <Component />
    </div>
  );
});
