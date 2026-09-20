import { define } from "../../../utils.ts";

// API route: `handlers` (2.x preferred name) with GET and POST. Any other method → 405.
export const handlers = define.handlers({
  GET(ctx) {
    return Response.json({ slug: ctx.params.slug, comments: [] });
  },
  async POST(ctx) {
    const body = await ctx.req.json();
    return Response.json({ slug: ctx.params.slug, received: body }, {
      status: 201,
    });
  },
});
