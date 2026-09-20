// SERVER-ONLY module. Three distinct server-only signals for the boundary analyzer:
//   - `Deno.openKv()`          (Deno KV)
//   - `Deno.env.get(...)`      (not a FRESH_PUBLIC_* literal, so it is not inlined)
//   - `node:crypto` import     (the Vite plugin's built-in checkImports rejects
//                               Node built-ins in the browser bundle)
// islands/Leaky.tsx imports this file → B001 (chain: islands/Leaky.tsx → lib/db.ts).
import { randomUUID } from "node:crypto";

let kv: Deno.Kv | undefined;

export async function getDb(): Promise<Deno.Kv> {
  kv ??= await Deno.openKv(Deno.env.get("DATABASE_URL"));
  return kv;
}

export function newId(): string {
  return randomUUID();
}
