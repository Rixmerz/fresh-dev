import type { FreshContext } from "$fresh/server.ts";

// Root middleware, 1.x shape: named export `handler` with (req, ctx).
export async function handler(req: Request, ctx: FreshContext) {
  ctx.state.user = req.headers.get("x-user") ?? undefined;
  return await ctx.next();
}
