import { render } from "preact";
import { routes } from "../routes/index.ts";

function App() {
  return (
    <ul>
      {routes.map((r) => (
        <li key={r.path}>
          <a href={r.path}>{r.name}</a>
        </li>
      ))}
    </ul>
  );
}

render(<App />, document.getElementById("app")!);
