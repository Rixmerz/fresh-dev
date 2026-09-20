/** Island discovery and props serialisability (plan §4.3 / §5 I002). */
import type {
  BoundaryViolation,
  FreshVersion,
  IslandEntry,
  ModuleFacts,
  ProjectGraph,
  PropInfo,
  PropsTypeInfo,
} from "./types.ts";
import { basename, stripExt } from "./fs.ts";
void basename;
import { reachImports } from "./graph.ts";

/** Fresh 2 `pathToExportName`: non-identifier characters become `_`. */
export function pathToExportName(file: string): string {
  const stem = stripExt(basename(file));
  let name = stem.replace(/[^A-Za-z0-9_$]/g, "_");
  if (/^[0-9]/.test(name)) name = "_" + name;
  return name;
}

/** Fresh 1 `stringToIdentifier` (also used for fresh.gen.ts identifiers): non-identifier runs → `_`. */
export function stringToIdentifier(s: string): string {
  let out = s.replace(/[^A-Za-z0-9_$]+/g, "_").replace(/_+/g, "_");
  if (/^[0-9]/.test(out)) out = "_" + out;
  return out;
}

/** Fresh 1 `sanitizeIslandName(path)` = toPascalCase(stringToIdentifier(path without extension)). */
export function sanitizeIslandName1(relPath: string): string {
  const id = stringToIdentifier(stripExt(relPath));
  return id.replace(/(^\w|-\w)/g, (m) => m.replace(/-/, "").toUpperCase());
}

/** Fresh 2 `UniqueNamer`: first come keeps the name, later ones get `_1`, `_2`… */
export class UniqueNamer {
  #seen = new Map<string, number>();
  getUniqueName(name: string): string {
    const n = this.#seen.get(name);
    if (n === undefined) {
      this.#seen.set(name, 0);
      return name;
    }
    let i = n + 1;
    while (this.#seen.has(`${name}_${i}`)) i++;
    this.#seen.set(name, i);
    this.#seen.set(`${name}_${i}`, 0);
    return `${name}_${i}`;
  }
}

const FN_RE = /=>|^\(|\bFunction\b|Handler$|\(method\)/;
const JSX_RE = /ComponentChildren|ComponentChild\b|VNode|JSX\.Element|preact\.JSX|ReactNode/;

export function serializability(
  typeText: string,
  propName: string,
  version: FreshVersion,
): { serializable: PropInfo["serializable"]; reason: string | null } {
  const t = typeText.trim();
  if (FN_RE.test(t)) {
    return { serializable: "no", reason: "functions cannot be serialized to an island" };
  }
  if (/Promise<|ReadableStream|WritableStream|\bsymbol\b|WeakMap|WeakSet/.test(t)) {
    return { serializable: "no", reason: `${t} cannot be serialized` };
  }
  if (JSX_RE.test(t)) {
    if (version === "2" || propName === "children") return { serializable: "yes", reason: null };
    return { serializable: "no", reason: "Fresh 1.x only accepts JSX as `children`" };
  }
  if (/\bSignal<|ReadonlySignal<|\bsignal\b/i.test(t)) return { serializable: "yes", reason: null };
  if (/\bDate\b|\bMap<|\bSet<|\bRegExp\b|\bURL\b|Temporal\./.test(t)) {
    if (version === "2") return { serializable: "yes", reason: null };
    return {
      serializable: "no",
      reason: `Fresh 1.x cannot serialize ${t}; pass a string/number instead`,
    };
  }
  if (/Uint8Array|\bbigint\b/.test(t)) return { serializable: "yes", reason: null };
  if (/^(string|number|boolean|null|undefined|unknown|any|never)(\[\])?$/.test(t)) {
    return { serializable: "yes", reason: null };
  }
  if (/^["'`]|^\d|^(true|false)\b/.test(t)) return { serializable: "yes", reason: null };
  if (/^\{|^Record<|^Array<|^Partial<|^Pick<|^Omit<|\[\]$|^\[/.test(t)) {
    return { serializable: "yes", reason: null };
  }
  if (/\|/.test(t)) {
    const parts = t.split("|").map((p) => serializability(p.trim(), propName, version));
    const bad = parts.find((p) => p.serializable === "no");
    if (bad) return bad;
    return parts.some((p) => p.serializable === "unknown")
      ? { serializable: "unknown", reason: "union member is a named type" }
      : { serializable: "yes", reason: null };
  }
  if (/^[A-Z][A-Za-z0-9_]*(<.*>)?$/.test(t)) {
    return {
      serializable: "unknown",
      reason: `${t} is a named type; class instances lose their prototype`,
    };
  }
  return { serializable: "unknown", reason: null };
}

export function propsOf(info: PropsTypeInfo | null, version: FreshVersion): PropInfo[] {
  if (!info) return [];
  return info.members.map((m) => {
    const s = serializability(m.typeText, m.name, version);
    return { name: m.name, typeText: m.typeText, optional: m.optional, ...s };
  });
}

export interface IslandsInput {
  version: FreshVersion;
  islandFiles: Map<string, "islands-dir" | "colocated" | "external">;
  islandsDir: string | null;
  facts: Map<string, ModuleFacts>;
  graph: ProjectGraph;
  violations: BoundaryViolation[];
}

export function buildIslands(input: IslandsInput): IslandEntry[] {
  const out: IslandEntry[] = [];
  const namer = new UniqueNamer();
  // registration order: islands/ first, then colocated (_islands), each in path order
  const ordered = [...input.islandFiles.entries()].sort((a, b) =>
    (a[1] === "colocated" ? 1 : 0) - (b[1] === "colocated" ? 1 : 0) || a[0].localeCompare(b[0])
  );
  for (const [file, source] of ordered) {
    const fact = input.facts.get(file);
    if (!fact) continue;
    const usedBy = input.graph.edges.filter((e) => e.kind === "renders" && e.to === file).map((e) =>
      e.from
    )
      .filter((v, i, a) => a.indexOf(v) === i);
    const closure = [...reachImports(input.graph, file).keys()].filter((f) => f !== file);
    const violations = input.violations.filter((v) => v.chain[0] === file);
    // Fresh iterates `Object.entries(mod)`: module namespace keys come in code-unit order
    const fnExports = fact.exports.filter((e) => e.isFunction && e.kind !== "reexport")
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of fnExports) {
      let name: string;
      let islandId: string | null = null;
      if (input.version === "2") {
        name = namer.getUniqueName(e.isDefault ? pathToExportName(file) : e.name);
      } else {
        // 1.x: path relative to the project root with a leading `islands/` stripped
        const rel = input.islandsDir && file.startsWith(input.islandsDir + "/")
          ? file.slice(input.islandsDir.length + 1)
          : file;
        name = sanitizeIslandName1(rel);
        islandId = `${name.toLowerCase()}_${e.name.toLowerCase()}`;
      }
      out.push({
        file,
        name,
        islandId,
        exportName: e.name,
        source,
        props: e.props && !e.props.unresolved ? propsOf(e.props, input.version) : [],
        usedBy,
        clientClosure: closure,
        violations,
        usesSignals: fact.usesSignals,
        hooks: fact.hooks,
        line: e.line,
      });
    }
    if (fnExports.length === 0) {
      out.push({
        file,
        name: pathToExportName(file),
        islandId: null,
        exportName: "(none)",
        source,
        props: [],
        usedBy,
        clientClosure: closure,
        violations,
        usesSignals: fact.usesSignals,
        hooks: fact.hooks,
        line: 1,
      });
    }
  }
  return out;
}
