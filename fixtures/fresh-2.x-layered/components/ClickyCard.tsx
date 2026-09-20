import { useSignal } from "@preact/signals";

// DEFECT (I004): a component under components/ with an `onClick` handler and
// `useSignal`. It is only ever rendered from routes/about.tsx (server-side), so
// it never hydrates and the click does nothing. Should live in islands/.
export function ClickyCard({ title }: { title: string }) {
  const open = useSignal(false);
  return (
    <div class="card" onClick={() => open.value = !open.value}>
      <h2>{title}</h2>
      {open.value && <p>Details</p>}
    </div>
  );
}
