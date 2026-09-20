import { ClickyCard } from "../components/ClickyCard.tsx";

// DEFECT (R008): this route exists on disk but is NOT listed in fresh.gen.ts,
// so Fresh 1.x never serves it until `deno task manifest` runs.
// Also renders a clicky component (server-only) → see I004.
export default function About() {
  return (
    <main>
      <h1>About</h1>
      <ClickyCard title="Team" />
    </main>
  );
}
