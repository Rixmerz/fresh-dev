// Isomorphic helper: no server-only or browser-only signals.
// Reachable from islands/Comments.tsx → classified `client` (shared).
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US");
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
