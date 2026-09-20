import { define } from "../utils.ts";
import { ClickyCard } from "../components/ClickyCard.tsx";

// Page only, no handler. Renders a component that (wrongly) has event handlers → see I004.
export default define.page(function About() {
  return (
    <main>
      <h1>About</h1>
      <ClickyCard title="Team" />
    </main>
  );
});
