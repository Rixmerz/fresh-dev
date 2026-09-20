import { define } from "../utils.ts";

// Root file-system middleware (scope "/"): one function, sets ctx.state.user.
export default define.middleware((ctx) => {
  ctx.state.user = ctx.req.headers.get("x-user") ?? undefined;
  return ctx.next();
});
