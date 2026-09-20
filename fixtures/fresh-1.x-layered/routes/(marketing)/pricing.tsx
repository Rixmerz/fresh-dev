import { PlanToggle } from "./(_islands)/PlanToggle.tsx";

// URL is /pricing — the (marketing) group segment is dropped.
export default function Pricing() {
  return (
    <main>
      <h1>Pricing</h1>
      <PlanToggle yearly={false} />
    </main>
  );
}
