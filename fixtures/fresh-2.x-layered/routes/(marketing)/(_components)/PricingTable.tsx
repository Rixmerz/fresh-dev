// Colocated component. `(_components)` is just an ignored folder for the
// crawler: NOT a route, NOT an island.
export function PricingTable({ plans }: { plans: string[] }) {
  return (
    <table class="pricing">
      <tbody>
        {plans.map((plan) => (
          <tr key={plan}>
            <td>{plan}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
