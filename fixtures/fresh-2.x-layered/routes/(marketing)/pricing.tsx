import { define } from "../../utils.ts";
import { PricingTable } from "./(_components)/PricingTable.tsx";
import { PlanToggle } from "./(_islands)/PlanToggle.tsx";

// URL is /pricing — the (marketing) group segment is dropped.
export default define.page(function Pricing() {
  return (
    <main>
      <PlanToggle yearly={false} />
      <PricingTable plans={["free", "pro"]} />
    </main>
  );
});
