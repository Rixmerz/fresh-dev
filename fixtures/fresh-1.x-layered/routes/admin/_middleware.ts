import type { FreshContext } from "$fresh/server.ts";

function requireUser(_req: Request, ctx: FreshContext) {
  if (!ctx.state.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  return ctx.next();
}

function auditLog(req: Request, ctx: FreshContext) {
  console.log(`[admin] ${req.method} ${ctx.url.pathname}`);
  return ctx.next();
}

// Array form: two middlewares for scope /admin, run in this order.
export const handler = [requireUser, auditLog];
