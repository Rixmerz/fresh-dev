import type { RouteConfig } from "fresh";
import { define } from "../../utils.ts";

// Catch-all API route whose URL is replaced by a literal routeOverride:
// file-derived pattern would be /old/:path*, effective pattern is /legacy/:path*.
export const config: RouteConfig = { routeOverride: "/legacy/:path*" };

export const handler = define.handlers({
  GET(ctx) {
    return ctx.redirect(`/docs/${ctx.params.path ?? ""}`, 301);
  },
});
