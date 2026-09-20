/**
 * Syntax-only extraction of Fresh-relevant facts from one module, using the TypeScript
 * compiler API (no type checker, no resolution — see plan D2).
 */
import ts from "typescript";
import type {
  ExportFact,
  HandlerFact,
  ImportFact,
  ModuleFacts,
  PropsTypeInfo,
  RouteConfigFact,
} from "./types.ts";
import { extOf, hashText, TEST_FILE_PATTERN } from "./fs.ts";
import { matchesSpecifierList } from "./resolve.ts";

const HOOK_NAMES = new Set([
  "useState",
  "useEffect",
  "useLayoutEffect",
  "useRef",
  "useMemo",
  "useCallback",
  "useReducer",
  "useContext",
  "useSignal",
  "useComputed",
  "useSignalEffect",
  "useId",
  "useErrorBoundary",
]);
const BROWSER_GLOBALS = new Set([
  "window",
  "document",
  "localStorage",
  "sessionStorage",
  "navigator",
]);
const APP_METHODS = new Set([
  "use",
  "get",
  "post",
  "patch",
  "put",
  "delete",
  "head",
  "all",
  "options",
  "route",
  "fsRoutes",
  "layout",
  "appWrapper",
  "notFound",
  "onError",
  "ws",
  "mountApp",
  "listen",
  "handler",
]);
const DEFINE_METHODS = new Set(["page", "handlers", "handler", "middleware", "layout"]);
const HTTP_METHODS = new Set(["HEAD", "GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"]);

export interface ParseOptions {
  serverOnlySpecifiers: string[];
  /** specifier as written → mapped value (for server-only matching through the import map) */
  mapSpecifier?: (spec: string) => string | null;
}

function scriptKind(path: string): ts.ScriptKind {
  switch (extOf(path)) {
    case ".tsx":
      return ts.ScriptKind.TSX;
    case ".jsx":
      return ts.ScriptKind.JSX;
    case ".js":
    case ".mjs":
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.TS;
  }
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  return (ts.getModifiers(node) ?? []).some((m) => m.kind === kind);
}

function unwrap(expr: ts.Expression): ts.Expression {
  let e = expr;
  for (;;) {
    if (ts.isParenthesizedExpression(e)) e = e.expression;
    else if (ts.isAsExpression(e) || ts.isSatisfiesExpression(e)) e = e.expression;
    else if (ts.isTypeAssertionExpression(e)) e = e.expression;
    else if (ts.isNonNullExpression(e)) e = e.expression;
    else return e;
  }
}

function isFunctionLike(e: ts.Node): boolean {
  return ts.isArrowFunction(e) || ts.isFunctionExpression(e) || ts.isFunctionDeclaration(e) ||
    ts.isClassExpression(e) || ts.isClassDeclaration(e);
}

/** `define.page(...)` / `define.handlers(...)` → "page" | "handlers" …, else null */
function defineCallName(e: ts.Expression): string | null {
  if (!ts.isCallExpression(e)) return null;
  const callee = e.expression;
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
    if (callee.expression.text === "define" && DEFINE_METHODS.has(callee.name.text)) {
      return callee.name.text;
    }
  }
  return null;
}

function objectKeys(obj: ts.ObjectLiteralExpression): string[] {
  const keys: string[] = [];
  for (const p of obj.properties) {
    const n = p.name;
    if (!n) continue;
    if (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNumericLiteral(n)) keys.push(n.text);
  }
  return keys;
}

function stringArray(e: ts.Expression): string[] | null {
  const u = unwrap(e);
  if (!ts.isArrayLiteralExpression(u)) return null;
  const out: string[] = [];
  for (const el of u.elements) {
    const x = unwrap(el);
    if (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) out.push(x.text);
  }
  return out;
}

export function parseModule(
  path: string,
  text: string,
  meta: { size: number; mtime: number },
  opts: ParseOptions,
): ModuleFacts {
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, scriptKind(path));
  const line = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

  const facts: ModuleFacts = {
    path,
    hash: hashText(text),
    size: meta.size,
    mtime: meta.mtime,
    isTest: TEST_FILE_PATTERN.test(path),
    hasJsx: false,
    imports: [],
    exports: [],
    jsx: [],
    handler: null,
    config: null,
    cssExport: null,
    hooks: [],
    usesSignals: false,
    signals: [],
    isBrowserImportedFrom: null,
    defineImportedFrom: null,
    defineCalls: [],
    appCalls: [],
    createsApp: false,
    callsStaticFiles: false,
    containsRouteOverrideText: text.includes("routeOverride"),
    renderCalls: [],
    assetRefs: [],
    types: {},
    parseErrors: [],
    lineCount: text.split("\n").length,
  };

  // deno-lint-ignore no-explicit-any
  const diags = ((sf as any).parseDiagnostics ?? []) as ts.DiagnosticWithLocation[];
  for (const d of diags.slice(0, 5)) {
    const l = d.start !== undefined ? sf.getLineAndCharacterOfPosition(d.start).line + 1 : 0;
    facts.parseErrors.push(`L${l}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);
  }

  // ---- symbol table of top-level declarations ----
  const locals = new Map<string, ts.Node>();
  for (const st of sf.statements) {
    if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name) {
      locals.set(st.name.text, st);
    } else if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) locals.set(d.name.text, d);
      }
    } else if (ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st)) {
      locals.set(st.name.text, st);
      const info = typeInfoFromDecl(st);
      if (info) facts.types[st.name.text] = info;
    }
  }
  const importedLocals = new Set<string>();

  function typeInfoFromDecl(
    d: ts.InterfaceDeclaration | ts.TypeAliasDeclaration,
  ): PropsTypeInfo | null {
    if (ts.isInterfaceDeclaration(d)) {
      return { typeName: d.name.text, members: membersOf(d.members), unresolved: false };
    }
    const t = d.type;
    if (ts.isTypeLiteralNode(t)) {
      return { typeName: d.name.text, members: membersOf(t.members), unresolved: false };
    }
    if (ts.isIntersectionTypeNode(t)) {
      const members = t.types.flatMap((x) => ts.isTypeLiteralNode(x) ? membersOf(x.members) : []);
      return {
        typeName: d.name.text,
        members,
        unresolved: t.types.some((x) => !ts.isTypeLiteralNode(x)),
      };
    }
    return { typeName: d.name.text, members: [], unresolved: true };
  }

  function membersOf(members: ts.NodeArray<ts.TypeElement>) {
    const out: PropsTypeInfo["members"] = [];
    for (const m of members) {
      if (ts.isPropertySignature(m) && m.name) {
        const name = ts.isIdentifier(m.name) || ts.isStringLiteral(m.name)
          ? m.name.text
          : m.name.getText(sf);
        out.push({
          name,
          typeText: m.type ? m.type.getText(sf) : "unknown",
          optional: !!m.questionToken,
        });
      } else if (ts.isMethodSignature(m) && m.name) {
        const name = ts.isIdentifier(m.name) ? m.name.text : m.name.getText(sf);
        out.push({ name, typeText: "(method)", optional: !!m.questionToken });
      }
    }
    return out;
  }

  function propsOfFunction(fn: ts.Node): PropsTypeInfo | null {
    let params: ts.NodeArray<ts.ParameterDeclaration> | undefined;
    if (ts.isFunctionDeclaration(fn) || ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) {
      params = fn.parameters;
    }
    if (!params || params.length === 0) return { typeName: null, members: [], unresolved: false };
    const p = params[0];
    const t = p.type;
    if (!t) return { typeName: null, members: [], unresolved: true };
    if (ts.isTypeLiteralNode(t)) {
      return { typeName: null, members: membersOf(t.members), unresolved: false };
    }
    if (ts.isTypeReferenceNode(t)) {
      const name = t.typeName.getText(sf);
      const known = facts.types[name];
      if (known) return known;
      // PageProps<Data> / Signal<...> etc. — external
      return { typeName: name, members: [], unresolved: true };
    }
    return { typeName: t.getText(sf), members: [], unresolved: true };
  }

  function paramCountOf(fn: ts.Node): number | null {
    if (ts.isFunctionDeclaration(fn) || ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) {
      return fn.parameters.length;
    }
    return null;
  }

  /** Follow an identifier to its local declaration initializer (one hop). */
  function resolveLocal(e: ts.Expression): ts.Node | null {
    const u = unwrap(e);
    if (!ts.isIdentifier(u)) return u;
    const d = locals.get(u.text);
    if (!d) return null;
    if (ts.isVariableDeclaration(d)) return d.initializer ? unwrap(d.initializer) : null;
    return d;
  }

  function handlerFromExpr(
    exportName: "handler" | "handlers",
    expr: ts.Expression | ts.Node,
    at: ts.Node,
  ): HandlerFact {
    let node: ts.Node | null = ts.isFunctionDeclaration(expr)
      ? expr
      : resolveLocal(expr as ts.Expression);
    let wrapper: string | null = null;
    if (node && ts.isCallExpression(node)) {
      const dn = defineCallName(node);
      if (dn) {
        wrapper = dn;
        node = node.arguments[0] ? resolveLocal(node.arguments[0]) : null;
      }
    }
    if (!node) {
      return {
        exportName,
        shape: "unknown",
        methods: [],
        paramCount: null,
        arrayLength: null,
        line: line(at),
        defineWrapper: wrapper,
      };
    }
    if (ts.isObjectLiteralExpression(node)) {
      return {
        exportName,
        shape: "object",
        methods: objectKeys(node),
        paramCount: null,
        arrayLength: null,
        line: line(at),
        defineWrapper: wrapper,
      };
    }
    if (ts.isArrayLiteralExpression(node)) {
      return {
        exportName,
        shape: "array",
        methods: [],
        paramCount: null,
        arrayLength: node.elements.length,
        line: line(at),
        defineWrapper: wrapper,
      };
    }
    if (isFunctionLike(node)) {
      return {
        exportName,
        shape: "function",
        methods: [],
        paramCount: paramCountOf(node),
        arrayLength: null,
        line: line(at),
        defineWrapper: wrapper,
      };
    }
    return {
      exportName,
      shape: "unknown",
      methods: [],
      paramCount: null,
      arrayLength: null,
      line: line(at),
      defineWrapper: wrapper,
    };
  }

  function configFromExpr(expr: ts.Expression): RouteConfigFact {
    const node = resolveLocal(expr);
    const out: RouteConfigFact = {
      routeOverride: null,
      routeOverrideNonLiteral: false,
      skipInheritedLayouts: null,
      skipAppWrapper: null,
      csp: null,
      methods: null,
    };
    if (!node || !ts.isObjectLiteralExpression(node)) return out;
    for (const p of node.properties) {
      if (!ts.isPropertyAssignment(p) || !p.name) continue;
      const key = ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : "";
      const v = unwrap(p.initializer);
      if (key === "routeOverride") {
        if (ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v)) {
          out.routeOverride = v.text;
        } else out.routeOverrideNonLiteral = true;
      } else if (key === "skipInheritedLayouts" || key === "skipAppWrapper" || key === "csp") {
        if (v.kind === ts.SyntaxKind.TrueKeyword) out[key] = true;
        else if (v.kind === ts.SyntaxKind.FalseKeyword) out[key] = false;
      } else if (key === "methods") {
        if (ts.isStringLiteral(v) && v.text === "ALL") out.methods = "ALL";
        else out.methods = stringArray(v);
      }
    }
    return out;
  }

  function addExport(
    name: string,
    kind: ExportFact["kind"],
    node: ts.Node,
    extra: Partial<ExportFact> = {},
  ) {
    const fact: ExportFact = {
      name,
      kind,
      isFunction: false,
      isDefault: name === "default",
      line: line(node),
      localName: null,
      reexportFrom: null,
      props: null,
      defineWrapper: null,
      paramCount: null,
      arrayLength: null,
      ...extra,
    };
    facts.exports.push(fact);
    return fact;
  }

  /** Classify an exported value expression (const initializer or `export default <expr>`). */
  function describeValue(expr: ts.Expression): Partial<ExportFact> {
    const u = unwrap(expr);
    const dn = defineCallName(u);
    if (dn && ts.isCallExpression(u)) {
      facts.defineCalls.push(dn);
      const inner = u.arguments[0] ? resolveLocal(u.arguments[0]) : null;
      const isComponent = dn === "page" || dn === "layout";
      const innerName =
        inner && (ts.isFunctionExpression(inner) || ts.isFunctionDeclaration(inner)) && inner.name
          ? inner.name.text
          : null;
      return {
        isFunction: isComponent || (dn === "middleware" && !!inner && isFunctionLike(inner)),
        defineWrapper: dn,
        props: inner && isFunctionLike(inner) && isComponent ? propsOfFunction(inner) : null,
        paramCount: inner ? paramCountOf(inner) : null,
        ...(innerName && inner ? { localName: innerName, line: line(inner) } : {}),
      };
    }
    if (isFunctionLike(u)) {
      return { isFunction: true, props: propsOfFunction(u), paramCount: paramCountOf(u) };
    }
    if (ts.isArrayLiteralExpression(u)) return { arrayLength: u.elements.length };
    if (ts.isIdentifier(u)) {
      const d = locals.get(u.text);
      if (d) {
        if (ts.isFunctionDeclaration(d) || ts.isClassDeclaration(d)) {
          return {
            isFunction: true,
            localName: u.text,
            props: propsOfFunction(d),
            paramCount: paramCountOf(d),
          };
        }
        if (ts.isVariableDeclaration(d) && d.initializer) {
          return { ...describeValue(d.initializer), localName: u.text };
        }
      }
      return { localName: u.text, isFunction: importedLocals.has(u.text) ? false : false };
    }
    return {};
  }

  // ---- statements ----
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st)) {
      const spec = (st.moduleSpecifier as ts.StringLiteral).text;
      const fact: ImportFact = {
        specifier: spec,
        names: [],
        default: null,
        namespace: null,
        isTypeOnly: !!st.importClause?.isTypeOnly,
        dynamic: false,
        reexport: false,
        line: line(st),
      };
      const clause = st.importClause;
      if (clause) {
        if (clause.name) {
          fact.default = clause.name.text;
          importedLocals.add(clause.name.text);
        }
        const nb = clause.namedBindings;
        if (nb) {
          if (ts.isNamespaceImport(nb)) {
            fact.namespace = nb.name.text;
            importedLocals.add(nb.name.text);
          } else {
            for (const el of nb.elements) {
              const imported = el.propertyName?.text ?? el.name.text;
              fact.names.push({ imported, local: el.name.text, isType: !!el.isTypeOnly });
              importedLocals.add(el.name.text);
              if (imported === "IS_BROWSER") facts.isBrowserImportedFrom = spec;
              if (el.name.text === "define") facts.defineImportedFrom = spec;
            }
          }
        }
      }
      facts.imports.push(fact);
      continue;
    }
    if (ts.isExportDeclaration(st)) {
      const spec = st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)
        ? st.moduleSpecifier.text
        : null;
      if (spec) {
        const fact: ImportFact = {
          specifier: spec,
          names: [],
          default: null,
          namespace: null,
          isTypeOnly: st.isTypeOnly,
          dynamic: false,
          reexport: true,
          line: line(st),
        };
        if (st.exportClause && ts.isNamedExports(st.exportClause)) {
          for (const el of st.exportClause.elements) {
            const imported = el.propertyName?.text ?? el.name.text;
            fact.names.push({ imported, local: el.name.text, isType: !!el.isTypeOnly });
            addExport(el.name.text, "reexport", el, { reexportFrom: spec, localName: imported });
          }
        } else if (st.exportClause && ts.isNamespaceExport(st.exportClause)) {
          fact.namespace = st.exportClause.name.text;
          addExport(st.exportClause.name.text, "reexport", st, { reexportFrom: spec });
        } else {
          fact.namespace = "*";
          addExport("*", "reexport", st, { reexportFrom: spec });
        }
        facts.imports.push(fact);
      } else if (st.exportClause && ts.isNamedExports(st.exportClause)) {
        for (const el of st.exportClause.elements) {
          const local = el.propertyName?.text ?? el.name.text;
          const d = locals.get(local);
          const kind: ExportFact["kind"] = d
            ? ts.isFunctionDeclaration(d)
              ? "function"
              : ts.isClassDeclaration(d)
              ? "class"
              : "const"
            : "unknown";
          const extra: Partial<ExportFact> = { localName: local };
          if (d && (ts.isFunctionDeclaration(d) || ts.isClassDeclaration(d))) {
            extra.isFunction = true;
            extra.props = propsOfFunction(d);
            extra.paramCount = paramCountOf(d);
          } else if (d && ts.isVariableDeclaration(d) && d.initializer) {
            Object.assign(extra, describeValue(d.initializer));
          }
          const fact = addExport(el.name.text, kind, el, extra);
          if ((fact.name === "handler" || fact.name === "handlers") && d) {
            const init = ts.isVariableDeclaration(d) ? d.initializer : d;
            if (init) facts.handler = handlerFromExpr(fact.name, init as ts.Expression, el);
          }
        }
      }
      continue;
    }
    if (ts.isExportAssignment(st) && !st.isExportEquals) {
      const desc = describeValue(st.expression);
      const u = unwrap(st.expression);
      const fact = addExport(
        "default",
        isFunctionLike(u) || desc.isFunction ? "function" : "const",
        st,
        desc,
      );
      if (ts.isArrayLiteralExpression(u)) fact.kind = "const";
      continue;
    }
    if (ts.isFunctionDeclaration(st) && hasModifier(st, ts.SyntaxKind.ExportKeyword)) {
      const isDefault = hasModifier(st, ts.SyntaxKind.DefaultKeyword);
      const name = isDefault ? "default" : st.name?.text ?? "default";
      const fact = addExport(name, "function", st, {
        isFunction: true,
        props: propsOfFunction(st),
        paramCount: st.parameters.length,
        localName: st.name?.text ?? null,
      });
      if (name === "handler" || name === "handlers") facts.handler = handlerFromExpr(name, st, st);
      void fact;
      continue;
    }
    if (ts.isClassDeclaration(st) && hasModifier(st, ts.SyntaxKind.ExportKeyword)) {
      const isDefault = hasModifier(st, ts.SyntaxKind.DefaultKeyword);
      addExport(isDefault ? "default" : st.name?.text ?? "default", "class", st, {
        isFunction: true,
        localName: st.name?.text ?? null,
      });
      continue;
    }
    if (ts.isVariableStatement(st) && hasModifier(st, ts.SyntaxKind.ExportKeyword)) {
      const kind: ExportFact["kind"] = st.declarationList.flags & ts.NodeFlags.Const
        ? "const"
        : st.declarationList.flags & ts.NodeFlags.Let
        ? "let"
        : "var";
      for (const d of st.declarationList.declarations) {
        if (!ts.isIdentifier(d.name)) continue;
        const name = d.name.text;
        const extra = d.initializer ? describeValue(d.initializer) : {};
        addExport(name, kind, d, { ...extra, localName: name });
        if ((name === "handler" || name === "handlers") && d.initializer) {
          facts.handler = handlerFromExpr(name, d.initializer, d);
        } else if (name === "config" && d.initializer) {
          facts.config = configFromExpr(d.initializer);
        } else if (name === "css" && d.initializer) {
          facts.cssExport = stringArray(d.initializer) ?? [];
        }
      }
      continue;
    }
    if (
      (ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st)) &&
      hasModifier(st, ts.SyntaxKind.ExportKeyword)
    ) {
      addExport(st.name.text, ts.isInterfaceDeclaration(st) ? "interface" : "type", st);
      continue;
    }
    if (ts.isEnumDeclaration(st) && hasModifier(st, ts.SyntaxKind.ExportKeyword)) {
      addExport(st.name.text, "enum", st);
    }
  }

  // ---- deep walk: JSX, hooks, signals, dynamic imports, app calls, asset refs ----
  const serverList = opts.serverOnlySpecifiers;
  for (const imp of facts.imports) {
    if (imp.isTypeOnly) continue;
    if (imp.specifier.startsWith("node:")) {
      facts.signals.push({
        kind: "node-builtin",
        detail: imp.specifier,
        line: imp.line,
        guarded: false,
      });
      continue;
    }
    const mapped = opts.mapSpecifier ? opts.mapSpecifier(imp.specifier) : null;
    const hit = matchesSpecifierList(imp.specifier, mapped, serverList);
    if (hit && hit !== "node:") {
      facts.signals.push({
        kind: "server-specifier",
        detail: imp.specifier,
        line: imp.line,
        guarded: false,
      });
    }
    if (imp.specifier === "@preact/signals" || imp.specifier.includes("@preact/signals")) {
      facts.usesSignals = true;
    }
  }

  const localNames = new Set<string>([...locals.keys(), ...importedLocals]);

  function isGuarded(node: ts.Node): boolean {
    let cur: ts.Node | undefined = node.parent;
    while (cur) {
      if (ts.isIfStatement(cur) || ts.isConditionalExpression(cur)) {
        const cond = (ts.isIfStatement(cur) ? cur.expression : cur.condition).getText(sf);
        if (/IS_BROWSER|typeof\s+(window|document|globalThis|navigator|localStorage)/.test(cond)) {
          return true;
        }
      }
      if (ts.isBinaryExpression(cur)) {
        const t = cur.left.getText(sf);
        if (/IS_BROWSER|typeof\s+(window|document)/.test(t)) return true;
      }
      if (ts.isCallExpression(cur) && ts.isIdentifier(cur.expression)) {
        const n = cur.expression.text;
        if (n === "useEffect" || n === "useLayoutEffect" || n === "useSignalEffect") return true;
      }
      if (ts.isJsxAttribute(cur)) return true; // event handler bodies only run in the browser
      cur = cur.parent;
    }
    return false;
  }

  function isPropertyNamePosition(id: ts.Identifier): boolean {
    const p = id.parent;
    if (ts.isPropertyAccessExpression(p) && p.name === id) return true;
    if (ts.isPropertyAssignment(p) && p.name === id) return true;
    if (ts.isShorthandPropertyAssignment(p) && p.name === id) return false;
    if (ts.isBindingElement(p) && p.propertyName === id) return true;
    if (ts.isPropertySignature(p) || ts.isMethodSignature(p) || ts.isMethodDeclaration(p)) {
      return true;
    }
    if (ts.isParameter(p) && p.name === id) return true;
    if (ts.isVariableDeclaration(p) && p.name === id) return true;
    if (ts.isImportSpecifier(p) || ts.isExportSpecifier(p)) return true;
    if (ts.isJsxAttribute(p)) return true;
    if (ts.isTypeReferenceNode(p) || ts.isTypeQueryNode(p)) return true;
    return false;
  }

  function jsxTagName(tag: ts.JsxTagNameExpression): string {
    return tag.getText(sf);
  }

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      facts.hasJsx = true;
      const attrs: string[] = [];
      let hasEventHandler = false;
      for (const a of node.attributes.properties) {
        if (ts.isJsxAttribute(a)) {
          const n = a.name.getText(sf);
          attrs.push(n);
          if (/^on[A-Z]/.test(n) || /^on[a-z]+$/.test(n)) hasEventHandler = true;
          // asset references in literal src/href/srcset
          if (
            (n === "src" || n === "href" || n === "srcset") && a.initializer &&
            ts.isStringLiteral(a.initializer)
          ) {
            const v = a.initializer.text;
            if (v.startsWith("/") && !v.startsWith("//")) {
              facts.assetRefs.push({ path: v.split(" ")[0], line: line(a) });
            }
          }
        }
      }
      facts.jsx.push({ tag: jsxTagName(node.tagName), line: line(node), attrs, hasEventHandler });
    } else if (ts.isJsxFragment(node)) {
      facts.hasJsx = true;
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (callee.kind === ts.SyntaxKind.ImportKeyword) {
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteral(arg)) {
          facts.imports.push({
            specifier: arg.text,
            names: [],
            default: null,
            namespace: null,
            isTypeOnly: false,
            dynamic: true,
            reexport: false,
            line: line(node),
          });
        }
      } else if (ts.isIdentifier(callee)) {
        const n = callee.text;
        if (HOOK_NAMES.has(n)) {
          if (!facts.hooks.includes(n)) facts.hooks.push(n);
          if (n === "useSignal" || n === "useComputed" || n === "useSignalEffect") {
            facts.usesSignals = true;
          }
        } else if (n === "staticFiles") facts.callsStaticFiles = true;
        else if (n === "page") facts.renderCalls.push({ kind: "page", line: line(node) });
        else if (n === "asset") {
          const a = node.arguments[0];
          if (a && ts.isStringLiteral(a)) facts.assetRefs.push({ path: a.text, line: line(node) });
        } else if (n === "signal" || n === "computed") facts.usesSignals = true;
      } else if (ts.isPropertyAccessExpression(callee)) {
        const method = callee.name.text;
        const recv = callee.expression;
        if (method === "render" && ts.isIdentifier(recv) && recv.text === "ctx") {
          facts.renderCalls.push({ kind: "ctx.render", line: line(node) });
        } else if (method === "renderNotFound") {
          facts.renderCalls.push({ kind: "renderNotFound", line: line(node) });
        } else if (
          APP_METHODS.has(method) &&
          (ts.isIdentifier(recv) || ts.isCallExpression(recv) || ts.isNewExpression(recv))
        ) {
          const recvIsApp = ts.isIdentifier(recv) ? /app$/i.test(recv.text) : true;
          if (recvIsApp) {
            const first = node.arguments[0];
            const path =
              first && (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first))
                ? first.text
                : null;
            const lazy = node.arguments.some((a) => {
              const u = unwrap(a);
              return (ts.isArrowFunction(u) || ts.isFunctionExpression(u)) &&
                /\bimport\s*\(/.test(u.getText(sf));
            });
            const argIdentifiers = node.arguments.flatMap((a) => {
              const u = unwrap(a);
              return ts.isIdentifier(u) ? [u.text] : [];
            });
            facts.appCalls.push({
              method,
              path,
              line: line(node),
              argCount: node.arguments.length,
              argIdentifiers,
              lazy,
            });
          }
        }
      }
    } else if (ts.isNewExpression(node)) {
      if (ts.isIdentifier(node.expression)) {
        if (node.expression.text === "App") facts.createsApp = true;
        if (node.expression.text === "HttpError") {
          facts.renderCalls.push({ kind: "HttpError", line: line(node) });
        }
      }
    } else if (ts.isPropertyAccessExpression(node)) {
      const recv = node.expression;
      if (ts.isIdentifier(recv) && recv.text === "Deno" && !localNames.has("Deno")) {
        const detail = `Deno.${node.name.text}`;
        // FRESH_PUBLIC_* literal reads are inlined into island bundles by Fresh 2
        let publicEnv = false;
        const p = node.parent;
        if (
          node.name.text === "env" && ts.isPropertyAccessExpression(p) && p.name.text === "get" &&
          ts.isCallExpression(p.parent) && p.parent.arguments[0] &&
          ts.isStringLiteral(p.parent.arguments[0]) &&
          p.parent.arguments[0].text.startsWith("FRESH_PUBLIC_")
        ) publicEnv = true;
        facts.signals.push({
          kind: publicEnv ? "public-env" : "deno-api",
          detail,
          line: line(node),
          guarded: isGuarded(node),
        });
        // do not descend into `Deno` identifier again
        ts.forEachChild(node.name, visit);
        return;
      }
    } else if (ts.isIdentifier(node)) {
      const n = node.text;
      if (BROWSER_GLOBALS.has(n) && !localNames.has(n) && !isPropertyNamePosition(node)) {
        // skip `typeof window` operands: those are guards, not uses
        const p = node.parent;
        if (!(ts.isTypeOfExpression(p))) {
          facts.signals.push({
            kind: "browser-global",
            detail: n,
            line: line(node),
            guarded: isGuarded(node),
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  // sanity: JSX in .ts files (R003) is reported by the validator via hasJsx + ext
  return facts;
}

/** Cheap check used by the crawler for R004 etc. */
export function isHttpMethod(name: string): boolean {
  return HTTP_METHODS.has(name);
}
