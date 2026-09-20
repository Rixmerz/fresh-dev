// DEFECT (B001 / I003): island importing a server-only module.
// Chain: islands/Leaky.tsx → lib/db.ts (Deno.env.get).
import { databaseUrl } from "../lib/db.ts";

export default function Leaky() {
  return <code>{databaseUrl()}</code>;
}
