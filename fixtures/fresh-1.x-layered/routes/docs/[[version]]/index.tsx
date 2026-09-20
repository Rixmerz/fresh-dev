import type { PageProps } from "$fresh/server.ts";

// Optional segment: /docs and /docs/:version (pattern `/docs{/:version}?`).
export default function Docs({ params }: PageProps) {
  return <h1>Docs {params.version ?? "latest"}</h1>;
}
