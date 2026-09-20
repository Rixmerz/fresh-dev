import { App, staticFiles } from "fresh";
import { define, type State } from "./utils.ts";
import { shopApp } from "./shop/app.ts";

export const app = new App<State>();

// 1. Static files first: without this neither `static/` nor island JS is served.
app.use(staticFiles());

// 2. Global middleware: applies to every route registered after it.
app.use(define.middleware((ctx) => {
  console.log(`${ctx.req.method} ${ctx.url.pathname}`);
  return ctx.next();
}));

// 3. Path-scoped middleware: `/admin` and everything below it.
app.use(
  "/admin",
  define.middleware(async (ctx) => {
    const res = await ctx.next();
    res.headers.set("cache-control", "no-store");
    return res;
  }),
);

// 4. Programmatic route (registered before fsRoutes → not guarded by routes/_middleware.ts).
app.get("/health", () => Response.json({ ok: true }));

// 5. Mounted sub-app: shop/app.ts registers GET /cart → served at /shop/cart.
app.mountApp("/shop", shopApp);

// 6. File-system routes.
app.fsRoutes();

// NOTE: no app.listen() — in Vite mode the plugin builds _fresh/server.js and
// `deno serve` runs it. Calling listen() here would be R017.
