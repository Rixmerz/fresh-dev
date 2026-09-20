import type { Context } from "fresh";
import type { State } from "../../utils.ts";

// DEFECT (R014): by-method middleware object. Fresh 2 rejects it at startup:
// "Middleware does not support object handlers with GET, POST, ...".
export const handler = {
  GET(ctx: Context<State>) {
    return ctx.next();
  },
};
