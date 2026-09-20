import { fromFileUrl, join } from "@std/path";
import { ProjectIndex } from "../core/index.ts";

export const FIXTURES = join(fromFileUrl(new URL("../../fixtures/", import.meta.url)));

export function fixture(name: string): string {
  return join(FIXTURES, name);
}

const cache = new Map<string, Promise<ProjectIndex>>();
export function loadFixture(name: string): Promise<ProjectIndex> {
  let p = cache.get(name);
  if (!p) {
    p = ProjectIndex.load(fixture(name), { force: true });
    cache.set(name, p);
  }
  return p;
}
