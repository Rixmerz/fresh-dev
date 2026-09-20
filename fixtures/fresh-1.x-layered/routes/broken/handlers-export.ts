import type { FreshContext } from "$fresh/server.ts";

// DEFECT (R013): Fresh 1.x only accepts `handler`. At startup it throws:
// 'Found named export "handlers" in ... instead of "handler". Did you mean "handler"?'
export const handlers = {
  GET(_req: Request, _ctx: FreshContext) {
    return new Response("never reached");
  },
};
