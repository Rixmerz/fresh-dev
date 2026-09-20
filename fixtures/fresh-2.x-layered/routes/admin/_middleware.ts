import { define } from "../../utils.ts";

const requireUser = define.middleware((ctx) => {
  if (!ctx.state.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  return ctx.next();
});

const auditLog = define.middleware((ctx) => {
  console.log(`[admin] ${ctx.state.user} ${ctx.url.pathname}`);
  return ctx.next();
});

// Array form: two middlewares for scope "/admin", run in this order.
export default [requireUser, auditLog];
