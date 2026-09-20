import { useSignal } from "@preact/signals";

// DEFECT (I004): component under components/ with `onClick` + `useSignal`.
// Rendered only from routes/about.tsx (server) → never hydrates.
export function ClickyCard({ title }: { title: string }) {
  const open = useSignal(false);
  return (
    <div class="card" onClick={() => open.value = !open.value}>
      <h2>{title}</h2>
      {open.value && <p>Details</p>}
    </div>
  );
}
