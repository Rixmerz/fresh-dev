import { useSignal } from "@preact/signals";
// DEFECT (B001 / I003): an island importing a server-only module.
// Chain: islands/Leaky.tsx → lib/db.ts (Deno.openKv, Deno.env, node:crypto).
import { newId } from "../lib/db.ts";

export default function Leaky() {
  const id = useSignal(newId());
  return <code>{id.value}</code>;
}
