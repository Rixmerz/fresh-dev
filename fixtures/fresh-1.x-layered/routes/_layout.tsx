import type { PageProps } from "$fresh/server.ts";
import { Nav } from "../components/Nav.tsx";

// Root layout: wraps every page except routes/admin/* (skipInheritedLayouts).
export default function RootLayout({ Component, state }: PageProps) {
  return (
    <div class="site">
      <Nav user={state.user as string | undefined} />
      <Component />
    </div>
  );
}
