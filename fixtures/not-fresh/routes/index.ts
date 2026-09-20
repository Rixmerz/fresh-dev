// A plain client-side route table. This directory is named `routes/` on
// purpose: a `routes/` folder alone must NOT make the detector think this is
// a Fresh project.
export interface RouteDef {
  path: string;
  name: string;
}

export const routes: RouteDef[] = [
  { path: "/", name: "Home" },
  { path: "/about", name: "About" },
];
