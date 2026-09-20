// SERVER-ONLY module: reads Deno.env. islands/Leaky.tsx imports it → B001.
export function databaseUrl(): string {
  return Deno.env.get("DATABASE_URL") ?? "postgres://localhost/blog";
}
