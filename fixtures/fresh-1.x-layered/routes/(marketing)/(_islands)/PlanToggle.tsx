import { useSignal } from "@preact/signals";

// Colocated island (1.x also registers any `(_islands)` folder under routes/).
// Named export → id routes_marketing_islands_plantoggle_plantoggle.
export function PlanToggle({ yearly }: { yearly: boolean }) {
  const on = useSignal(yearly);
  return (
    <button type="button" onClick={() => on.value = !on.value}>
      {on.value ? "Yearly" : "Monthly"}
    </button>
  );
}
