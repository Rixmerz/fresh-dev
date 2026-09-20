import { App } from "fresh";
import type { State } from "../utils.ts";

// Small sub-app mounted by main.ts at "/shop" → this route answers /shop/cart.
export const shopApp = new App<State>();

shopApp.get("/cart", (ctx) => {
  return Response.json({ items: [], user: ctx.state.user ?? null });
});
