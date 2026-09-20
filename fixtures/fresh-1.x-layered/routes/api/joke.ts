import type { FreshContext } from "$fresh/server.ts";

const JOKES = [
  "Why do Java developers often wear glasses? They can't C#.",
  "I love pressing the F5 key. It's refreshing.",
];

// Function-form handler (answers every method).
export const handler = (_req: Request, _ctx: FreshContext): Response => {
  const body = JOKES[Math.floor(Math.random() * JOKES.length)];
  return new Response(body);
};
