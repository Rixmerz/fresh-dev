import type { Handlers, RouteConfig } from "$fresh/server.ts";

// Catch-all API route with a literal routeOverride:
// file-derived pattern /old/:path*, effective pattern /legacy/:path*.
export const config: RouteConfig = { routeOverride: "/legacy/:path*" };

export const handler: Handlers = {
  GET(_req, ctx) {
    return new Response(null, {
      status: 301,
      headers: { location: `/docs/${ctx.params.path ?? ""}` },
    });
  },
};
