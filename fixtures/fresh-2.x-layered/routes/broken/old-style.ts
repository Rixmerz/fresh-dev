import type { Context } from "fresh";
import type { State } from "../../utils.ts";

// DEFECT (R012): 1.x-style two-argument handler. Fresh 2 throws at startup:
// "Handlers must only have one argument".
export const handler = (req: Request, ctx: Context<State>) =>
  new Response(`${req.method} ${ctx.url.pathname}`);
