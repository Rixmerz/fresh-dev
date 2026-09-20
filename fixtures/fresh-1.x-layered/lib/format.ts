// Isomorphic helper: no server-only or browser-only signals.
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US");
}
