// DEFECT (R018): `.mts` is not one of the crawler's extensions (tsx|jsx|ts|js),
// so this file is silently never registered as a route.
export const handler = () => new Response("never registered");
