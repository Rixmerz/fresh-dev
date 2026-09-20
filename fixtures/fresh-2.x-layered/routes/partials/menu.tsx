import type { RouteConfig } from "fresh";
import { Partial } from "fresh/runtime";
import { define } from "../../utils.ts";

// Partial route: rendered without the app wrapper and without any layout.
export const config: RouteConfig = {
  skipAppWrapper: true,
  skipInheritedLayouts: true,
};

export default define.page(function Menu() {
  return (
    <Partial name="menu">
      <ul>
        <li>
          <a href="/">Home</a>
        </li>
        <li>
          <a href="/blog">Blog</a>
        </li>
      </ul>
    </Partial>
  );
});
