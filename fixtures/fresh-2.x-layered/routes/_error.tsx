import { HttpError } from "fresh";
import { define } from "../utils.ts";

// 2.x unified error page (replaces _404.tsx/_500.tsx). Scope "/".
export default define.page(function ErrorPage({ error }) {
  const status = error instanceof HttpError ? error.status : 500;
  return (
    <main class="error">
      <h1>{status}</h1>
      <p>{status === 404 ? "Page not found" : "Something went wrong"}</p>
    </main>
  );
});
