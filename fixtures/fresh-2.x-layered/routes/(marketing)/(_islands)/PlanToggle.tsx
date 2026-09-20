import { useSignal } from "@preact/signals";

// Colocated island: any `(_islands)` folder under routes/ registers islands.
// Named export → island "PlanToggle".
export function PlanToggle({ yearly }: { yearly: boolean }) {
  const on = useSignal(yearly);
  return (
    <button type="button" onClick={() => on.value = !on.value}>
      {on.value ? "Yearly" : "Monthly"}
    </button>
  );
}
