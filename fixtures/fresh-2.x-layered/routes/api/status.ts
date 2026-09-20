import { define } from "../../utils.ts";

// Function-form handler: answers every HTTP method (methods: ALL).
export const handlers = define.handlers((ctx) => {
  return Response.json({ ok: true, path: ctx.url.pathname });
});
