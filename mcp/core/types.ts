/**
 * Shared data model of the fresh-dev semantic index.
 *
 * Everything here is derived statically from a Fresh project on disk.
 * `confidence: "inferred"` marks facts that required a guess (a lazy import,
 * a non-literal `routeOverride`, a barrel re-export); `"extracted"` facts were
 * read directly from source.
 */

export type FreshVersion = "1" | "2";
export type Flavor = "1.x-manifest" | "2.x-vite" | "2.x-builder" | "unknown";
export type Confidence = "extracted" | "inferred";

export interface Detection {
  isFresh: boolean;
  version: FreshVersion | null;
  flavor: Flavor;
  /** Version string as written in the import map (e.g. "^2.3.3" or "1.7.3"). */
  freshVersion: string | null;
  freshSpecifier: string | null;
  preactSpecifier: string | null;
  denoConfigPath: string | null;
  dirs: {
    routes: string | null;
    islands: string | null;
    components: string | null;
    static: string[];
    assets: string | null;
  };
  entry: {
    main: string | null;
    dev: string | null;
    client: string | null;
    config: string | null;
    utils: string | null;
    manifest: string | null;
    vite: string | null;
  };
  confidence: "high" | "medium" | "low";
  evidence: string[];
  /** Deno workspace members that are themselves Fresh apps (monorepo). */
  apps: string[];
}

export interface DenoConfig {
  path: string | null;
  dir: string;
  raw: Record<string, unknown>;
  imports: Record<string, string>;
  scopes: Record<string, Record<string, string>>;
  tasks: Record<string, string>;
  compilerOptions: Record<string, unknown>;
  lintTags: string[];
  workspace: string[];
  nodeModulesDir: string | boolean | null;
  exclude: string[];
}

export interface FreshDevConfig {
  serverOnlySpecifiers: string[];
  browserOnlySpecifiers: string[];
  ignore: string[];
  maxFileBytes: number;
}

// ---------------------------------------------------------------------------
// Module facts (output of core/parse.ts)
// ---------------------------------------------------------------------------

export interface ImportFact {
  specifier: string;
  /** Named bindings: `import { a as b }` → { imported: "a", local: "b" }. */
  names: { imported: string; local: string; isType: boolean }[];
  default: string | null;
  namespace: string | null;
  isTypeOnly: boolean;
  dynamic: boolean;
  /** Re-export (`export { x } from "./y.ts"` / `export * from`). */
  reexport: boolean;
  line: number;
}

export type ExportKind =
  | "function"
  | "class"
  | "const"
  | "let"
  | "var"
  | "type"
  | "interface"
  | "enum"
  | "reexport"
  | "unknown";

export interface PropMember {
  name: string;
  typeText: string;
  optional: boolean;
}

export interface PropsTypeInfo {
  typeName: string | null;
  members: PropMember[];
  /** true when the type could not be resolved in this file (imported, generic…). */
  unresolved: boolean;
}

export interface ExportFact {
  name: string;
  kind: ExportKind;
  /** The export is (or wraps) a function/component: function, arrow, class, define.page(...). */
  isFunction: boolean;
  isDefault: boolean;
  line: number;
  /** Local identifier when exported under another name. */
  localName: string | null;
  reexportFrom: string | null;
  /** First-parameter type of a function export (component props). */
  props: PropsTypeInfo | null;
  /** `define.page` / `define.layout` / `define.handlers` / `define.middleware` wrapper, when used. */
  defineWrapper: string | null;
  /** Number of declared parameters for function-like exports. */
  paramCount: number | null;
  /** Element count when the exported value is an array literal (middleware lists). */
  arrayLength: number | null;
}

export interface JsxUse {
  tag: string;
  line: number;
  attrs: string[];
  hasEventHandler: boolean;
}

export interface SignalFact {
  kind: "deno-api" | "node-builtin" | "server-specifier" | "browser-global" | "public-env";
  detail: string;
  line: number;
  guarded: boolean;
}

export interface AppCall {
  method: string;
  path: string | null;
  line: number;
  argCount: number;
  /** Identifier arguments (e.g. the sub-app passed to mountApp). */
  argIdentifiers: string[];
  /** true when the handler/middleware argument is a dynamic import (lazy). */
  lazy: boolean;
}

export interface RouteConfigFact {
  routeOverride: string | null;
  routeOverrideNonLiteral: boolean;
  skipInheritedLayouts: boolean | null;
  skipAppWrapper: boolean | null;
  csp: boolean | null;
  methods: string[] | "ALL" | null;
}

export interface HandlerFact {
  exportName: "handler" | "handlers";
  /** "object" (by method), "function", "array" (middleware list) or "unknown" (identifier we could not resolve). */
  shape: "object" | "function" | "array" | "unknown";
  methods: string[];
  paramCount: number | null;
  /** Number of entries when the handler is an array of middlewares. */
  arrayLength: number | null;
  line: number;
  defineWrapper: string | null;
}

export interface ModuleFacts {
  /** Workspace-relative POSIX path. */
  path: string;
  hash: string;
  size: number;
  mtime: number;
  isTest: boolean;
  hasJsx: boolean;
  imports: ImportFact[];
  exports: ExportFact[];
  jsx: JsxUse[];
  handler: HandlerFact | null;
  config: RouteConfigFact | null;
  cssExport: string[] | null;
  hooks: string[];
  usesSignals: boolean;
  signals: SignalFact[];
  isBrowserImportedFrom: string | null;
  defineImportedFrom: string | null;
  defineCalls: string[];
  appCalls: AppCall[];
  createsApp: boolean;
  callsStaticFiles: boolean;
  containsRouteOverrideText: boolean;
  renderCalls: { kind: "ctx.render" | "page" | "renderNotFound" | "HttpError"; line: number }[];
  assetRefs: { path: string; line: number }[];
  /** Top-level interfaces/type literals by name, used to resolve props types. */
  types: Record<string, PropsTypeInfo>;
  parseErrors: string[];
  lineCount: number;
}

// ---------------------------------------------------------------------------
// Routes, islands, components
// ---------------------------------------------------------------------------

export type RouteKind =
  | "page"
  | "api"
  | "page+handler"
  | "middleware"
  | "layout"
  | "app"
  | "notFound"
  | "error"
  | "programmatic";

export interface RouteEntry {
  file: string;
  /** Path relative to the routes dir without extension, leading `/`. */
  id: string;
  kind: RouteKind;
  /** URL pattern with groups stripped and `routeOverride` applied (null for app/layout/middleware). */
  pattern: string | null;
  /** Pattern before `routeOverride`. */
  filePattern: string | null;
  /** Scope for middleware/layout/error: the routes-relative directory (groups kept). */
  scope: string;
  group: string | null;
  methods: string[];
  hasPage: boolean;
  hasHandler: boolean;
  handlerShape: HandlerFact["shape"] | null;
  /** Middleware: number of middleware functions the file registers (array length or 1). */
  handlerCount: number | null;
  config: RouteConfigFact | null;
  params: string[];
  catchAll: boolean;
  optional: boolean;
  /** Applicable wrappers, outer → inner (files). */
  layouts: string[];
  middlewares: string[];
  app: string | null;
  errorRoute: string | null;
  /** Components rendered directly (files). */
  renders: string[];
  /** Islands hydrated by this route, directly or through components (files). */
  islands: string[];
  confidence: Confidence;
  /** 2.x: the crawler loads the module eagerly when the text contains "routeOverride". */
  eager: boolean;
  /** Programmatic routes: where it was registered. */
  registeredAt: { file: string; line: number } | null;
  extra: string[];
}

export interface PropInfo {
  name: string;
  typeText: string;
  optional: boolean;
  serializable: "yes" | "no" | "unknown";
  reason: string | null;
}

export interface IslandEntry {
  file: string;
  /** Island name as Fresh registers it (2.x: UniqueNamer over module name / export name; 1.x: sanitized path). */
  name: string;
  /** 1.x runtime id `${name.toLowerCase()}_${exportName.toLowerCase()}`; null in 2.x. */
  islandId: string | null;
  exportName: string;
  source: "islands-dir" | "colocated" | "external";
  props: PropInfo[];
  usedBy: string[];
  clientClosure: string[];
  violations: BoundaryViolation[];
  usesSignals: boolean;
  hooks: string[];
  line: number;
}

export interface ComponentEntry {
  file: string;
  exports: string[];
  usedBy: string[];
  boundary: Boundary;
  reachableFromIslands: boolean;
}

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------

export type NodeKind =
  | "project"
  | "route"
  | "layout"
  | "middleware"
  | "app"
  | "error"
  | "island"
  | "component"
  | "module"
  | "external"
  | "asset";

export interface GraphNode {
  id: string;
  kind: NodeKind;
  file: string | null;
  specifier: string | null;
  scheme: "jsr" | "npm" | "https" | "node" | "bare" | null;
}

export type EdgeKind =
  | "imports"
  | "renders"
  | "hydrates"
  | "wraps"
  | "guards"
  | "handles"
  | "passes_data"
  | "references_asset";

export interface GraphEdge {
  from: string;
  to: string;
  kind: EdgeKind;
  line: number | null;
  confidence: Confidence;
  detail: string | null;
}

export interface ProjectGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  /** file → resolved local import targets */
  importsOf: Map<string, { target: string; line: number; dynamic: boolean; typeOnly: boolean }[]>;
  /** file → files importing it */
  importedBy: Map<string, string[]>;
  externalsOf: Map<string, { specifier: string; scheme: GraphNode["scheme"]; line: number }[]>;
  unresolved: { file: string; specifier: string; line: number; reason: string }[];
}

// ---------------------------------------------------------------------------
// Boundaries
// ---------------------------------------------------------------------------

export type Boundary = "client-entry" | "client" | "server" | "shared" | "unknown";

export interface BoundaryInfo {
  file: string;
  /** Reachability: who bundles/loads this module. */
  boundary: Boundary;
  /** What the module's own code needs: server APIs, browser globals, or neither. */
  nature: "server-only" | "browser-only" | "isomorphic";
  serverSignals: SignalFact[];
  browserSignals: SignalFact[];
  /** Islands (or client.ts) from which this module is reachable. */
  reachableFrom: string[];
  reachableFromServer: boolean;
}

export interface BoundaryViolation {
  id: string;
  severity: "error" | "warning";
  file: string;
  line: number | null;
  /** island → … → offending module */
  chain: string[];
  signal: SignalFact;
  message: string;
}

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

export type Severity = "error" | "warning" | "info";
export type Category = "routes" | "islands" | "boundaries" | "dependencies" | "conventions";

export interface Finding {
  id: string;
  severity: Severity;
  category: Category;
  file: string;
  line: number | null;
  message: string;
  hint: string | null;
  confidence: Confidence;
  source: "fresh-dev" | "deno lint" | "deno check";
}

export interface ValidationResult {
  ok: boolean;
  findings: Finding[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
    unverified: string[];
    categories: Category[];
    external: { denoLint: boolean; denoCheck: boolean };
  };
}

export interface IndexStats {
  files: number;
  parsed: number;
  reused: number;
  removed: number;
  ms: number;
  builtAt: string;
}
