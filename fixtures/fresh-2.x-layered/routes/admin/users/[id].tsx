import { page } from "fresh";
import { define } from "../../../utils.ts";

// Handler object with two methods (GET renders, DELETE answers 204) + page.
export const handlers = define.handlers({
  GET(ctx) {
    return page({ id: ctx.params.id });
  },
  DELETE() {
    return new Response(null, { status: 204 });
  },
});

export default define.page<typeof handlers>(function AdminUser({ data }) {
  return <h1>User {data.id}</h1>;
});
