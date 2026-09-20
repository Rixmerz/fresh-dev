import { define } from "../utils.ts";

// Per-route CSS export (2.x): extra stylesheet loaded only for this route.
export const css = ["./assets/dashboard.css"];

export default define.page(function Dashboard({ state }) {
  return (
    <main class="dashboard">
      <h1>Hello {state.user ?? "guest"}</h1>
    </main>
  );
});
