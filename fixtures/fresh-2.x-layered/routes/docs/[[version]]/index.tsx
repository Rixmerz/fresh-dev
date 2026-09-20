import { define } from "../../../utils.ts";

// Optional segment: /docs and /docs/:version both match (pattern `/docs{/:version}?`).
export default define.page(function Docs({ params }) {
  return (
    <main>
      <h1>Docs {params.version ?? "latest"}</h1>
    </main>
  );
});
