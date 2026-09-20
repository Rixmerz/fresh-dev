# Plan afinado — plugin `fresh-dev` (Claude Code)

> **Audiencia:** el agente (Opus) que va a implementar el plugin. Este documento
> es el resultado de investigar el repo actual, el framework Fresh (1.7.3 y
> 2.3.x), la especificación vigente de plugins de Claude Code, y los contratos
> reales de **Vise** y **LiveSpec** (repos `Rixmerz/vise` y `Rixmerz/livespec`,
> leídos en su `main` al 2026-09-20). Cada decisión cita de dónde sale.
>
> **Principio central (no cambia):** `fresh-dev` conoce Fresh; Vise conoce
> cómo orquestar agentes; LiveSpec conoce el sistema completo.
>
> **Idioma:** este plan está en español. **Todo lo que se commitea dentro del
> plugin (skills, commands, hooks, descripciones de tools, código, comentarios,
> mensajes) va en inglés**, por la misma razón que Vise lo exige en su
> `CLAUDE.md`: los subagentes de Vise precargan sus charters y skills en inglés
> y el canal agente-a-agente es inglés; un skill en otro idioma se degrada al
> traducirse en la cabeza del builder.

---

## 0. Resumen ejecutivo y decisiones

| # | Decisión | Recomendación | Por qué (evidencia) |
|---|---|---|---|
| D1 | **Runtime del nuevo Fresh MCP** | **Deno 2 + TypeScript**, no Node. Servidor nuevo en `fresh-dev/mcp/`, independiente del generador Node existente. | Todo proyecto Fresh ya tiene `deno` instalado (prerrequisito del framework). Deno resuelve import maps, `jsr:`, `npm:` y `https:` nativamente; `deno info --json`, `deno lint --json` (tag `fresh`) y `deno check` son la fuente de verdad de tipos/lint, que el plan dice **no** reimplementar. El generador actual (`fresh-mcp-server/`, Node, MCP SDK 1.22) es un generador de plantillas con solo 2 tools registradas (`create_complete_landing`, `search_images`), no un analizador: reutilizarlo obligaría a cargar Node en un proyecto Deno. |
| D2 | **Parser y resolución** | Sintaxis: `npm:typescript` (API del compilador, **solo parse**: `createSourceFile` + walker; alternativa `npm:oxc-parser` si hace falta velocidad) para `.tsx/.jsx/.ts/.js`; **sin** type-checker propio. Resolución en dos niveles: (1) local, propia: `deno.json`/`deno.jsonc` `imports` (clave exacta, luego prefijo más largo para claves terminadas en `/` como `@/`, `$fresh/`, `$std/`), campo `importMap`, relativos y `file:`; (2) remota (`jsr:`/`npm:`/`https:`): `jsr:@deno/loader` (el mismo resolver que usa `@fresh/plugin-vite`; `cachedOnly` para no tocar la red) con `deno info --json` como respaldo. | El MCP necesita AST sintáctico (imports, exports, JSX, tipos de props); los tipos reales vienen de `deno lsp` y `deno check`. `deno info --json main.ts` **no** cubre `routes/` en Fresh 2 porque el crawler las descubre por filesystem (`fsRoutes()`), aunque en 1.x sí (`fresh.gen.ts` importa todo). No existe `@deno/ast` oficial en JSR; `tsc`/`typescript-language-server` no resuelven `fresh`, `jsr:` ni `$fresh/` (verificado: `TS2307`). |
| D3 | **`workspace` obligatorio en cada tool** | Igual que LiveSpec (sin fallback a cwd ni env). | LiveSpec lo hizo obligatorio en v0.12 tras errores multi-repo (`plugin/skills/livespec/SKILL.md`: "no cwd fallback"). Los agentes de Vise ya están entrenados en ese patrón; un segundo MCP con reglas distintas confunde. |
| D4 | **Commands → skills invocables por usuario** | Implementar `/fresh-dev:init` etc. como `skills/<name>/SKILL.md` con `disable-model-invocation: true`; sin directorio `commands/`. | La doc oficial de plugins declara `commands/` como formato legacy y las skills como forma preferida (mismo `$ARGUMENTS`, más `allowed-tools`, `context: fork`, `paths`). Ver §7. |
| D5 | **Nombre del plugin y namespace** | Plugin **`fresh-dev`** → `/fresh-dev:init`, `/fresh-dev:analyze`… (no `/fresh:init`). Servidor MCP con clave **`fresh`** → tools `fresh_*`. | El namespace de comandos/skills es siempre `/<plugin-name>:<skill>`; para tener `/fresh:init` el plugin tendría que llamarse `fresh`, que colisiona con el nombre del framework y con un futuro plugin oficial. **Pendiente de confirmación del usuario** (§15). |
| D6 | **LSP** | `.lsp.json` con **`deno lsp`** para `.ts/.tsx/.js/.jsx/.mts/.mjs`. Nunca `typescript-language-server`. | `typescript-language-server` no resuelve `$fresh/`, `jsr:` ni `npm:` sin `node_modules`; Vise ya detecta y avisa exactamente esta colisión (`vise/src/vise/cli/main.py:177-197`). El `LSP` tool de Claude Code es **navegación** (definiciones, referencias, símbolos); los diagnósticos salen de `deno check`/`deno lint` vía `fresh_validate` y `.vise/quality.yaml`. |
| D7 | **Integración con Vise** | Recipes en formato Vise con capabilities del namespace **`x.fresh.*`**; bindings en `.vise/capabilities.yaml`; validadores expuestos como **CLI headless** para `.vise/quality.yaml`. Sin agentes propios. | La taxonomía de capabilities de Vise es cerrada pero acepta `x.*` (`vise/src/vise/recipes/capabilities.py`). Vise **no tiene capa de dispatch** cross-MCP: `recipe_run` devuelve un plan y `CapabilityValidator` falla con "run it yourself" (`validators.py:773-932`). El único gate que Vise ejecuta de verdad es `quality_check` (argv sin shell), así que el validador Fresh debe existir como comando con exit code. |
| D8 | **Integración con LiveSpec** | `fresh_graph_export` escribe un `graph.json` **compatible con Graphify (NetworkX node-link)** que LiveSpec ingiere con `ingest_external_graph`; `.livespec.toml` `[graph] external = ".fresh-dev/graph.json"`, `auto_ingest = true`. | Es el **único** canal de entrada de grafos externos que LiveSpec tiene hoy (`livespec/src/livespec_mcp/domain/external_graph.py`, `external_ingest.py`). Solo ingiere aristas cuyos dos extremos son símbolos que LiveSpec ya indexó; nunca crea símbolos. Los hechos a nivel archivo (patrones de ruta, fronteras) **no** caben en LiveSpec hoy y se quedan en fresh-mcp (§11). |
| D9 | **Soporte de versiones** | Fresh **2.x (2.3.x, estable, docs en usefresh.dev)** como objetivo principal, **1.7.x** como legacy soportado. | Las 6 apps de ejemplo del repo son 1.7.3 (`$fresh/` en `deno.json`, `fresh.gen.ts`) y sirven de fixtures 1.x. El plan original asume `fresh.gen.ts`, que **no existe en 2.x**. |
| D10 | **Ubicación** | **Decisión final del usuario: repo propio `Rixmerz/fresh-dev`** (la raíz del repo es la raíz del plugin), publicable en el marketplace `rixmerz` con `source: github`, igual que `vise`. Las 6 apps de ejemplo 1.7.3 de `fresh-mcp` se copiaron a `fixtures/fresh-1.x/`; el generador Node sigue en `Rixmerz/fresh-mcp` sin cambios. | El usuario indicó aplicar el plan en el repositorio vacío `fresh-dev`. Las rutas `fresh-dev/…` de §3 se leen como la raíz de este repo. |
| D11 | **Read-only hasta fase 10** | Todas las tools devuelven datos; ninguna escribe en el proyecto. Única excepción explícita: `fresh_graph_export` escribe **solo** bajo `<workspace>/.fresh-dev/`. | Mismo contrato que LiveSpec (`.mcp-docs/`) y Vise (`.vise/`): footprint propio, nunca el árbol del usuario. |

---

## 1. Hallazgos de la investigación

### 1.1 Este repo (`Rixmerz/fresh-mcp`, `main` = `02dfc00`)

- `fresh-mcp-server/` es un **generador de plantillas** en Node/TypeScript (MCP SDK `^1.22.0`, zod). Tiene handlers para 11 tools pero **solo registra 2** en `registerTools` (`create_complete_landing`, `search_images`); `analyze_project` existe pero solo cuenta archivos. Nada de lo que el plan pide (grafo, fronteras, impacto) existe hoy.
- Contiene **6 apps Fresh 1.7.3 completas** (`cafe-artesanal`, `ciberseguridad-landing`, `frutas-frescas`, `joyeria-elegante`, `joyeria-landing`, `perfume-luxe`) con `deno.json`, `fresh.gen.ts`, `routes/`, `islands/`, `components/`, `tailwind.config.ts`. Ninguna tiene `_middleware.ts` ni `_layout.tsx`; todas tienen `_app.tsx`, `_404.tsx` y `routes/api/joke.ts`. Son fixtures 1.x listos; **faltan fixtures 2.x y fixtures con middleware/layouts/route groups**.
- `docs/` tiene conocimiento Fresh reutilizable para los skills: `JSX_PITFALLS.md` (islands vs components, rutas, `class` vs `className`), `COMPONENT_COMPOSITION.md`, `COMMON_ISSUES.md` y `TAILWIND_SETUP.md` (todo **1.x + Tailwind 3**; Fresh 2 usa Tailwind 4 vía plugin de Vite, hay que revisarlo antes de citarlo).
- `fresh-mcp-server/src/utils/tailwind-validator.ts` (`validateTailwindSetup`, 4 categorías) y `validation.ts` (`validateJSXStructure`, `validateFreshConventions`) contienen reglas portables al validador `conventions` (§5).
- **Deuda que hay que resolver antes de publicar nada** (fase 0):
  - `fresh-mcp-server/.claude.json` está commiteado con una **API key de Pexels en claro** y rutas absolutas de la máquina del autor. Hay que **rotar la key**, borrar el archivo del árbol y añadir `.claude.json` a `.gitignore`. Es un repo público.
  - `.serena/` en 4 apps de ejemplo, `.playwright-mcp/*.png`, `CAMBIOS_REALIZADOS.md`, `TEST_REPORT.md`, `INTEGRATION_REPORT.md`, `test-*.{ts,js,sh}` sueltos en la raíz del servidor.
  - `fresh-mcp-server/CLAUDE.md` dice MCP SDK 0.5.0 y 5 tools; no coincide con el código.
  - No hay `.github/` (ni CI ni plantilla de PR); `deno` no está en el entorno de CI/sandbox por defecto (sí Node 22 y Python 3.11).

### 1.2 Fresh hoy (verificado contra `denoland/fresh` `main` y tag `1.7.3`, `jsr.io/@fresh/core@2.3.3`, y proyectos generados con Deno 2.9.7)

- **Fresh 2.3.3 (`@fresh/core@2.3.3`, `@fresh/plugin-vite@1.1.2`, `@fresh/init@2.3.3`) es la versión estable**; `1.7.3` es el último tag 1.x. Docs 2.x en `usefresh.dev/docs/*`, 1.x en `usefresh.dev/docs/1.x/*` (`fresh.deno.dev` redirige). 2.3 añadió `ctx.upgrade()`/`app.ws()`, `f-view-transition`, `staticDir` múltiple, `csp({useNonce})`, `ipFilter()`, `trustProxy`, `deno create @fresh/init`.
- **Fresh 2 (modo Vite, el default de `jsr:@fresh/init`)** genera: `deno.json` (`"fresh": "jsr:@fresh/core@^2.3.3"`, `@fresh/plugin-vite`, `vite`, `npm:preact`, `npm:@preact/signals`, alias `@/`; `nodeModulesDir: "manual"`; tasks `dev: vite`, `build: vite build`, `start: deno serve -A _fresh/server.js`; `compilerOptions.jsx: "precompile"`, `jsxImportSource: "preact"`, `types: ["vite/client"]`; `lint.rules.tags: ["fresh","recommended"]`), `main.ts` (**exporta** `app = new App<State>()`, `app.use(staticFiles())`, `app.fsRoutes()`, **sin `app.listen()`**), `utils.ts` (`createDefine<State>()`), `vite.config.ts` (`plugins: [fresh()]` de `@fresh/plugin-vite`), `client.ts` (importa `assets/styles.css`), `assets/`, `routes/_app.tsx`, `routes/index.tsx`, `routes/api/[name].tsx` (`define.handlers({GET})`), `islands/Counter.tsx`, `components/Button.tsx`, `static/`. **No hay `fresh.gen.ts`, `fresh.config.ts` ni `dev.ts`.** Build: `_fresh/server.js`, `_fresh/server/`, `_fresh/client/`.
- **Fresh 2 modo builder** (`--builder`, soportado): `dev.ts` con `Builder` de `fresh/dev` (`builder.listen(() => import("./main.ts"))`, `build()`), sin Vite ni `client.ts`, CSS en `static/` con `<link>` en `_app.tsx`.
- **Fresh 1.x**: `$fresh/server.ts` (`start`, `createHandler`, `defineRoute/Layout/App/Config`, tipos `Handlers`, `PageProps`, `FreshContext`, `RouteConfig`, `MiddlewareHandler`), `$fresh/runtime.ts` (`IS_BROWSER`, `asset`, `Head`, `Partial`), `$fresh/dev.ts`, `fresh.gen.ts` (`routes`, `islands`, `baseUrl`; identificadores `$ruta_x`), `fresh.config.ts` (`defineConfig({plugins:[tailwind()]})`), `dev.ts` → `dev(import.meta.url, "./main.ts", config)`, `main.ts` → `start(manifest, config)`; `compilerOptions.jsx: "react-jsx"`; build `_fresh/snapshot.json` + `_fresh/static/`.
- Diferencias que importan al analizador (detalle en §4): en 2.x el export preferido es `handlers` (y `handler` se acepta; **`handlers` gana**), en 1.x `handlers` **lanza error** al arrancar; 2.x handlers reciben `(ctx)` (una función con 2 argumentos es error de arranque), 1.x `(req, ctx)`; 2.x reconoce `_error.tsx` además de `_404`/`_500`; en **ambas** versiones el crawler es recursivo en `islands/`, reconoce `(_islands)/` bajo `routes/`, ignora cualquier `(_xxx)/`, solo mira `tsx|jsx|ts|js` (no `.mts`) y salta `/[._]test\.(?:[tj]sx?|[mc][tj]s)$/`; en **ambas** versiones cada función exportada de un archivo island es una island.

### 1.3 Especificación de plugins de Claude Code (docs oficiales, code.claude.com)

Lo que cambia respecto al plan original:

- **Skills > commands.** `commands/*.md` es legacy; una skill con `disable-model-invocation: true` es un comando de usuario. Frontmatter relevante: `name`, `description`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `disallowed-tools`, `context: fork` + `agent`, `model`, `effort`, **`paths`** (globs que disparan la skill automáticamente), `argument-hint`, `$ARGUMENTS`/`$0..$n`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}` (dir persistente por plugin en `~/.claude/plugins/data/<id>/`).
- **Hooks** (`hooks/hooks.json`, verificado contra `code.claude.com/docs/en/hooks.md`): eventos útiles aquí: `SessionStart` (matchers `startup|resume|clear|compact|fork`), `PostToolUse` (matcher por tool + **`if` con sintaxis de permisos para acotar por ruta**: `"if": "Edit(**/routes/**)"` — desde v2.1.214 `Edit(routes/**)` solo matchea `routes/` en el cwd, así que se usa `**/routes/**`), `CwdChanged` (sin matcher, dispara siempre), `DirectoryAdded` (matchers `slash_command|register_repo_root`), `FileChanged` (matcher = nombres de archivo literales, p. ej. `deno.json|fresh.gen.ts`), `PreCompact`. Tipos de handler: `command`, `prompt`, `agent`, `http`, **`mcp_tool`** (`{"type":"mcp_tool","server":"plugin:<plugin>:<server>","tool":"…","input":{…}}`; el servidor debe estar ya conectado; `input` admite `${cwd}`, `${tool_input.file_path}`…). Salida: exit 0 + JSON `{"hookSpecificOutput": {"hookEventName": …, "additionalContext": {"type":"text","text": …}}}` (forma objeto; PostToolUse la admite); exit 2 bloquea (no lo usamos nunca). `async: true` para no esperar. **Timeout por defecto de `command` es 600 s** → fijar siempre `timeout` explícito.
- **MCP**: `.mcp.json` en la raíz del plugin; `${CLAUDE_PLUGIN_ROOT}` en `command`/`args`; nombre de tool instalado como plugin: `mcp__plugin_<plugin>_<server>__<tool>` (el guion de `fresh-dev` puede normalizarse a `_`; **confirmar en la instalación real** y documentarlo en el skill, como hace LiveSpec en `plugin/agents/livespec.md`).
- **LSP**: `.lsp.json` con `command`, `args`, `extensionToLanguage`, `transport`, `env`, `initializationOptions`, `settings`, `startupTimeout`, `diagnostics`, `restartOnCrash`. **No hay prioridad ni arbitraje entre plugins que reclaman la misma extensión** (Vise lo documenta en `core/plugin_conflicts.py`).
- **Agents** de plugin no pueden declarar `hooks`, `mcpServers` ni `permissionMode` (irrelevante: no creamos agentes).
- **`bin/`** en la raíz del plugin se añade al PATH de Bash. **Evals**: `claude plugin eval` con `evals/<case>/prompt.md` + `graders/*.md` (`regex`, `tool_used`, `tool_order`, `file_exists`, `llm`); `/skill-doctor` para uso/costo de skills.

### 1.4 Vise (`Rixmerz/vise` @ `7223d41`, 0.1.0a28) — contratos que fresh-dev debe respetar

- **Recipes**: YAML en `src/vise/assets/recipes/`, `~/.vise/recipes/` y **`<project>/.vise/recipes/`** (mayor precedencia). Campos: `name`, `description`, `inputs`, `steps[{id, capability, description, args}]`, opcionales `tier` (L1/L2/L3), `cost`, `cadence`. `recipe_run` **no ejecuta**: devuelve un plan ordenado (tool resuelta + args renderizados) que el agente ejecuta.
- **Capabilities**: taxonomía cerrada (`web.*`, `validate.*`, `deploy.*`, `db.*`, `fs.*`, `code.*`, `vcs.*`, `notify.*`, `ai.*`, `meta.*`, `workflow.*`) + **namespace de extensión `x.*`** aceptado con warning. Resolución: pin de usuario (`.vise/recipe-defaults.yaml`) → asignaciones (`.vise/capabilities.yaml`, formato `"<mcp>.<tool>": "<capability>"`, escrito por `capability_set`) → internos. Efecto de una capability desconocida = `sideeffect` (`CAPABILITY_EFFECT`), lo que impide usarla en loops L1 hasta que Vise la clasifique (follow-up del lado de Vise, §10.5).
- **Validators de nodo**: `tests_pass`, `lint_pass`, `command_exit`, `capability` (sin dispatch → falla pidiendo ejecutar a mano), `lsp_clean` (**para TypeScript usa `tsc`**, inválido en Deno), `quality_check` (lee `.vise/quality.yaml`, argv sin shell, skip-pass si el binario falta, requiere `vise approve <check>` o `VISE_TRUST_PROJECT_TOOLS=1`), `openspec`, `symbol_index`, design gates. `quality-gate-graph.yaml` gatea por **nombre de check**: `lint`, `types`, `complexity`, `dead_code`, `deps`, `unit`, `coverage`, `sast`, `secrets`, `sca`, `contracts`, `integration`, `e2e`, `spec`.
- **Agentes**: `vise:frontend` y `vise:backend-typescript` precargan `engineering-baseline`, `web-ui-rules`/`typescript-rules`, `ponytail`, y tienen el tool `Skill`. **No cargan skills de otros plugins solos**: el orquestador debe nombrarlas en el brief (la skill `orchestration` ya exige esto para `general-purpose`). La precedencia de `engineering-baseline` (usuario > seguridad > convenciones del repo > `*-rules` > `ponytail`) aplica también a lo que digan los skills Fresh.
- **Neighbours**: Vise no puede llamar a otros MCP; lee sus **huellas en disco** (`.mcp-docs/docs.db`, `.flowtrace/`, `graphify-out/graph.json`) desde `core/neighbour_state.py` y las nombra en briefs (`orchestration/SKILL.md` §Neighbours). La huella de fresh-dev será `<workspace>/.fresh-dev/`.
- **Hooks de Vise**: Python vía `bin/vise-run`, todos **fail-open** (exit 0 siempre), `SessionStart` inyecta ≤15 líneas, `PostToolUse Edit|Write` da feedback sin bloquear (`edit_feedback.py`), `context_cost.py` **avisa cuando un resultado de tool supera 32 KB** → las respuestas de `fresh_*` deben ser compactas/paginadas.
- Marketplace de desarrollo local `vise-dev` en el propio repo; publicado en `rixmerz` (`Rixmerz/claude-plugins`).

### 1.5 LiveSpec (`Rixmerz/livespec` @ `5e42b72`, 0.32.0) — lo que ya sabe de Fresh y cómo se le entregan hechos

- Ya es "framework-aware" para Deno Fresh, pero de forma mínima: `islands/**` cuenta como entry point (no dead code) y `find_endpoints(framework="fresh")` lista símbolos bajo `islands/` (`tools/analysis.py:1293-1450`); `_fresh/` está excluido como output de build; **no** modela rutas Fresh como `route_ref` (eso solo existe para Flask/FastAPI/Spring/Hono/Express) ni fronteras server/client.
- **`ingest_external_graph(graph_path, dry_run=True, remove=False, relations=None, workspace)`** lee un `graph.json` NetworkX node-link: `nodes[{id, label, source_file, source_location:"L<n>", _callable, _origin}]`, `links[{source, target, relation, confidence:"EXTRACTED"|"INFERRED"|"AMBIGUOUS", confidence_score}]`. Mapea nodos a símbolos por `(source_file, line)` y por `(source_file, label)`; **descarta** todo nodo que no corresponda a un símbolo indexado y toda arista con relación desconocida. Relaciones ingeridas por defecto: `calls`, `indirect_call`, `instantiates` → `calls`; `inherits`, `mixes_in`, `implements`, `extends`, `specializes`, `embeds` → `inherits`; `uses`, `references`, `accesses`, `reads_from`, `requires`, `depends_on`, `uses_static_prop`, **`uses_component`**, `references_constant`, `binds_method`, `bound_to` → `references`. `imports`/`imports_from`/`re_exports`/`includes` existen pero están **off por defecto** (harían que `who_calls` cuente importadores como callers). Peso máximo 0.9 (`EXTRACTED`), 0.6 (`INFERRED`), 0.5 (`AMBIGUOUS`). Idempotente y reversible (`origin='external:graphify'`, migración 22/23).
- Configuración: `.livespec.toml` → `[graph] external = "<path>"`, `auto_ingest = true|false`; estado en `<workspace>/.mcp-docs/docs.db`; `workspace` obligatorio; `index_project` incremental por hash; `git_diff_impact` para PRs.
- Publicado como plugin `livespec` (`plugin/` con `.mcp.json` → `uvx livespec@0.32.0`), con subagente y skill; el subagente **no** declara `tools:` porque el prefijo `mcp__plugin_livespec_livespec__*` cambia según cómo se instale.

---

## 2. Principios y límites del plugin

1. **fresh-dev responde preguntas Fresh; no ejecuta trabajo.** Todas las tools son consultas. Cambiar código lo hace Claude Code (o los agentes de Vise) con Edit/Write; los recipes describen *qué preguntar antes de tocar*.
2. **No duplica al LSP ni a LiveSpec.** Tipos, referencias por símbolo y errores → `deno lsp` / `deno check`. Grafo de llamadas por símbolo, dead code, Specs → LiveSpec. fresh-dev aporta lo que ninguno de los dos modela: **rutas, islands, layouts, middleware, fronteras server/client, cadena de una request, impacto en términos de Fresh**.
3. **No crea agentes.** Expone skills que los agentes de Vise cargan por nombre y hechos que el orquestador pega en briefs.
4. **Read-only** (D11). Ninguna tool modifica archivos del usuario en fases 1–9.
5. **Fail-open en hooks, fail-closed en validadores** (mismo criterio que Vise): un hook que falla sale 0 en silencio; `fresh_validate` que no puede analizar un archivo lo reporta como `unverified`, nunca como limpio.
6. **Honestidad del análisis estático.** Todo lo que sea inferencia (p. ej. una island alcanzada vía import dinámico, un `routeOverride` con expresión no literal) se marca `confidence: "inferred"` en la salida. Nada se presenta como hecho si se dedujo.
7. **Respuestas acotadas.** Cada tool tiene `summary_only`/`limit`/`offset` donde la salida pueda crecer; objetivo < 16 KB por respuesta (Vise avisa a 32 KB).
8. **Inglés en assets** (ver cabecera).

---

## 3. Estructura del repo y del plugin

```
fresh-dev/                          (repo Rixmerz/fresh-dev — la raíz del repo es la raíz del plugin)
├── (raíz)                          ← plugin.json, .mcp.json, .lsp.json, bin/, mcp/, skills/, hooks/…
│   ├── .claude-plugin/plugin.json
│   ├── .mcp.json                   servidor "fresh" (deno run … mcp/main.ts)
│   ├── .lsp.json                   deno lsp para .ts/.tsx/.js/.jsx/.mts/.mjs
│   ├── README.md                   instalación, qué hace/qué no, tabla de tools
│   ├── CHANGELOG.md
│   ├── bin/
│   │   ├── fresh-dev-run           launcher: localiza deno, cachea deps la 1ª vez, exec main.ts (patrón vise-run)
│   │   └── fresh-mcp               CLI headless: `fresh-mcp validate|routes|impact|export <workspace> --json`
│   ├── mcp/                        el Fresh MCP (Deno, TS)
│   │   ├── deno.json               imports: npm:@modelcontextprotocol/sdk, npm:typescript, jsr:@std/*
│   │   ├── main.ts                 stdio server; registra tools de tools/
│   │   ├── cli.ts                  mismo core, salida JSON + exit code (para quality.yaml y hooks)
│   │   ├── core/
│   │   │   ├── detect.ts           señales → {isFresh, version, flavor, dirs}
│   │   │   ├── scan.ts             walk de routes/ islands/ components/ static/ (+ ignore)
│   │   │   ├── parse.ts            TS compiler API parse-only → ModuleFacts (imports/exports/JSX/handlers/config)
│   │   │   ├── resolve.ts          import map (deno.json/deno.jsonc) + relativos + jsr/npm/https → ModuleRef
│   │   │   ├── routes.ts           archivo → patrón de ruta, kind, grupos, layouts, middlewares (1.x y 2.x)
│   │   │   ├── islands.ts          descubrimiento (islands/**, (_islands)/), exports, props
│   │   │   ├── graph.ts            nodos/aristas + índice incremental por hash
│   │   │   ├── boundaries.ts       clasificación server|client|shared|unknown + violaciones
│   │   │   ├── trace.ts            URL → ruta + cadena app/layouts/middlewares/handler/page/islands
│   │   │   ├── impact.ts           archivos cambiados → rutas/islands/middlewares afectados
│   │   │   └── export.ts           Graphify node-link JSON para LiveSpec
│   │   ├── validators/             una regla = un archivo; catálogo en validators/index.ts
│   │   │   ├── routes.ts  islands.ts  boundaries.ts  dependencies.ts  conventions.ts
│   │   ├── tools/                  un archivo por tool MCP (schema zod + handler delgado)
│   │   ├── fixtures/ → ../../fixtures (symlink o path en tests)
│   │   └── tests/                  deno test; snapshots golden por fixture
│   ├── skills/
│   │   ├── fresh-development/  fresh-routing/  fresh-islands/  fresh-components/
│   │   ├── fresh-data-flow/  fresh-middleware/  fresh-architecture/  fresh-debugging/
│   │   ├── init/  analyze/  routes/  impact/  validate/  debug/   ← "commands" (disable-model-invocation)
│   │   └── _shared/references/     cheat-sheets 1.x vs 2.x, catálogo de reglas, tabla de tools
│   ├── hooks/
│   │   ├── hooks.json
│   │   ├── detect_fresh.ts  invalidate_graph.ts  validate_fresh.ts   (deno, fail-open)
│   ├── recipes/                    YAML formato Vise (x.fresh.*); /fresh-dev:init los copia a .vise/recipes/
│   ├── templates/
│   │   ├── vise/capabilities.yaml  vise/quality.fresh.yaml
│   │   └── livespec/livespec.toml.snippet
│   ├── evals/                      claude plugin eval (casos por skill)
│   └── agents/README.md            "intencionalmente vacío — ver §8"
├── fixtures/
│   ├── fresh-1.x/                  las 6 apps actuales (movidas desde fresh-mcp-server/)
│   ├── fresh-1.x-layered/          nueva: _layout, _middleware anidado, route groups, [...rest], islands anidadas
│   ├── fresh-2.x-basic/            `deno run -Ar jsr:@fresh/init` limpio (commiteado)
│   ├── fresh-2.x-layered/          nueva: define.*, (_islands)/, _error.tsx, app.use(), mountApp, WebSocket
│   └── not-fresh/                  proyecto Deno/Vite sin Fresh (falso positivo)
├── legacy/fresh-mcp-server/        generador Node actual, sin cambios; README indica su estado
├── docs/                           PLAN_FRESH_DEV.md (este), + docs existentes revisadas para 2.x
└── .github/workflows/ci.yml        denoland/setup-deno → deno fmt --check, lint, check, test; claude plugin eval (manual)
```

Notas:
- `plugin.json` mínimo: `{"name":"fresh-dev","version":"0.1.0","description":…,"author":…,"homepage":…,"license":"MIT","keywords":[…]}`. `skills/`, `hooks/hooks.json`, `.mcp.json`, `.lsp.json` se detectan por convención (no hace falta declararlos).
- Marketplace local de desarrollo `fresh-dev-local` en `fresh-dev/.claude-plugin/marketplace.json` (mismo truco que `vise-dev`: **nunca** declarar el nombre `rixmerz` dentro de este repo, desplazaría al marketplace real).
- Publicación: PR a `Rixmerz/claude-plugins` añadiendo `{"name":"fresh-dev","source":{"source":"git-subdir","url":"https://github.com/Rixmerz/fresh-mcp.git","path":"fresh-dev"}}`. Fase 5 o posterior.
- Cuando el MCP esté estable, publicar `mcp/` en JSR (`@rixmerz/fresh-mcp`) y que `.mcp.json` apunte a `deno run … jsr:@rixmerz/fresh-mcp@<pin>` (mismo patrón que `uvx livespec@0.32.0`): elimina la dependencia de la ruta del plugin para `quality.yaml`. Hasta entonces, ruta local vía `${CLAUDE_PLUGIN_ROOT}`.

---

## 4. Fresh MCP (`fresh`)

### 4.1 Runtime y arranque

- `.mcp.json`:
  ```json
  {
    "mcpServers": {
      "fresh": {
        "command": "${CLAUDE_PLUGIN_ROOT}/bin/fresh-dev-run",
        "args": ["mcp"],
        "env": { "DENO_DIR": "${CLAUDE_PLUGIN_DATA}/deno-cache" }
      }
    }
  }
  ```
- `bin/fresh-dev-run` (sh): (1) busca `deno` en PATH / `~/.deno/bin`; si no está, imprime una línea con la instrucción de instalación y sale ≠0 — un servidor sin deno no debe arrancar "vacío" (misma razón que `vise-run`); (2) primera ejecución: `deno cache mcp/main.ts` (necesita red una vez; después offline); (3) `exec deno run --allow-read --allow-env --allow-run=deno --allow-write=<workspace>/.fresh-dev,$DENO_DIR --no-prompt mcp/main.ts --stdio`. `--allow-read` se limita al workspace pasado en cada llamada más `$DENO_DIR`: como los permisos se fijan al arrancar y el workspace llega después, usar `--allow-read` amplio pero **rechazar en código** cualquier `workspace` fuera de `$HOME` o que no contenga `deno.json` (mismo guard que LiveSpec contra indexar `/`).
- Logs a **stderr** siempre (stdout es el protocolo). `--stdio` obligatorio como en el servidor actual.
- Un proceso sirve N workspaces (mapa `workspace → Index`), como LiveSpec.

### 4.2 Detección (`core/detect.ts`) — señales y precedencia

| Señal | Fresh 2.x | Fresh 1.x | Peso |
|---|---|---|---|
| `deno.json`/`deno.jsonc` `imports` | `imports["fresh"]` contiene `@fresh/core` (es exactamente el test `detectFresh2()` de `@fresh/update`); además `@fresh/plugin-vite`, `vite`, `npm:preact`, `npm:@preact/signals`, alias `@/` | `"$fresh/": "https://deno.land/x/fresh@1.x/"`; `preact` vía esm.sh; `@preact/signals-core`; `$std/` | **decisivo** (versión) |
| Manifest | ausente | `fresh.gen.ts` con `satisfies Manifest` | decisivo 1.x |
| Config / build | `vite.config.ts` con `import { fresh } from "@fresh/plugin-vite"` (flavor `2.x-vite`) **o** `dev.ts` con `import { Builder } from "fresh/dev"` (flavor `2.x-builder`) | `fresh.config.ts` con `defineConfig` de `$fresh/server.ts` | fuerte |
| Entradas | `main.ts` con `new App<State>()` + `app.fsRoutes()` (exporta `app`, sin `listen()` en Vite); `utils.ts` con `createDefine`; `client.ts` (Vite) | `main.ts` con `start(manifest, config)`; `dev.ts` con `dev(import.meta.url, …)` de `$fresh/dev.ts` | fuerte |
| Imports en código | `from "fresh"`, `"fresh/runtime"`, `"fresh/dev"`, `"fresh/compat"` | `"$fresh/server.ts"`, `"$fresh/runtime.ts"`, `"$fresh/dev.ts"`, `"$fresh/plugins/*.ts"` | fuerte |
| Directorios | `routes/`, `islands/`, `components/`, `static/`, `assets/` (Vite), `_fresh/server.js` + `_fresh/client/` (build) | `routes/`, `islands/`, `components/`, `static/`, `_fresh/snapshot.json` + `_fresh/static/` | medio (solos no bastan: Remix/SvelteKit también tienen `routes/`) |
| Otros | tasks `dev: vite`, `build: vite build`, `start: deno serve -A _fresh/server.js`, `update: … jsr:@fresh/update`; `compilerOptions.jsx: "precompile"` + `jsxPrecompileSkipElements` + `types: ["vite/client"]`; `nodeModulesDir: "manual"` | tasks `start: deno run -A --watch=static/,routes/ dev.ts`, `build: deno run -A dev.ts build`, `cli`/`manifest`; `jsx: "react-jsx"`; `nodeModulesDir: true` solo con tailwind | apoyo |
| Ambas | `lint.rules.tags` incluye `"fresh"`; `exclude: ["**/_fresh/*"]`; `.vscode/settings.json` `deno.enable: true` | | apoyo |

Resultado: `{isFresh, version: "1"|"2"|null, flavor: "1.x-manifest"|"2.x-vite"|"2.x-builder"|"unknown", freshVersion (del specifier o `deno.lock`), preactSpecifier, dirs, entry: {main, dev, client, config, utils}, staticDirs (2.x `fresh({staticDir})`/`Builder({staticDir})` pueden ser varios; primero gana), confidence: "high"|"medium"|"low", evidence: [señales]}`.

Monorepo: `fresh_project` acepta `workspace` que sea la app; si el `deno.json` es un workspace Deno (`"workspace": [...]`), devuelve `apps: [...]` con los miembros que sean Fresh y pide llamar con el sub-path. Nunca se indexa "la carpeta padre de muchos repos" (regla de LiveSpec).

### 4.3 Modelo de datos (grafo Fresh)

**Nodos** (`id` = ruta relativa al workspace, POSIX; símbolos `path::Name`):

| Tipo | Origen | Atributos |
|---|---|---|
| `project` | detect | version, flavor, dirs, tasks, freshVersion |
| `route` | `routes/**/*.{ts,tsx,js,jsx,mts}` que no empiece por `_` ni esté en `(_islands)`/`(_components)` | `pattern` (`/blog/:slug`), `kind`: `page`\|`api`\|`page+handler`, `methods` (GET…), `hasPage`, `config` (`routeOverride`, `skipInheritedLayouts`, `skipAppWrapper`), `group` (`(marketing)`), `params`, `catchAll`, `optional` |
| `layout` | `_layout.tsx` | `scope` (dir), `config.skipInheritedLayouts` |
| `middleware` | `_middleware.ts` | `scope`, `handlers: n` (array o función), `methods` si se detecta (2.x `define.middleware`) |
| `app` | `_app.tsx` | — |
| `error` | `_404.tsx`, `_500.tsx`, `_error.tsx` (2.x) | `codes` |
| `island` | `islands/**` (recursivo, ambas versiones) y `routes/**/(_islands)/**` (ambas); más islands externas declaradas en `fresh({ islandSpecifiers })` (Vite) / `builder.registerIsland(spec)` (`jsr:`/`npm:`/`https:`/`file:`) | `exports`: **cada función exportada es una island** (2.x: el `default` se llama como el archivo, `pathToExportName`; 1.x: id `<nombre>_<export>`); `props: [{name, type, serializable: yes\|no\|unknown, reason}]` según la tabla de serialización por versión (§5 I002), `usesSignals`, `usesHooks`, `usesBrowserGlobalsUnguarded` |
| `component` | `components/**`, `routes/**/(_components)/**` (carpeta ignorada por el crawler, no especial) y cualquier módulo con JSX no clasificado como island/route | `exports`, `usedBy` |
| `module` | resto de archivos locales importados (lib/, utils/, db.ts…) | `serverOnlySignals: [...]`, `browserOnlySignals: [...]` |
| `external` | `jsr:`, `npm:`, `https:`, `node:` | `specifier`, `resolvedVia: import-map\|bare` |
| `asset` | `static/**` | referenciado por `asset()`/`href`/`src` literal |

**Aristas** (dirigidas, con `confidence: extracted|inferred`):

| Relación | De → a | Cómo se extrae |
|---|---|---|
| `imports` | módulo → módulo/external | `import`/`export … from`/`import()` literal |
| `renders` | route/layout/app/component/island → component/island | uso JSX `<Name …>` resuelto al import; `uses_component` en la exportación a LiveSpec |
| `hydrates` | route → island | transitivo: route `renders*` island (directa o vía componentes) |
| `wraps` | app → layouts → route | por jerarquía de directorios + `skipInheritedLayouts`/`skipAppWrapper` |
| `guards` | middleware → route | por prefijo de directorio, orden raíz → hoja; en 2.x también `app.use()` global (parseado de `main.ts`, marcado `inferred` si el orden depende de código no literal) |
| `handles` | route → `handler.GET` … | export `handler`/`handlers` (objeto con métodos o función) o `define.handlers` |
| `passes_data` | handler → page | `ctx.render(data)` (1.x) / `ctx.render(<Page data={…}/>)` o `page(data)` (2.x); tipo `Data` de `Handlers<Data>`/`PageProps<Data>` cuando es literal |
| `references_asset` | módulo → asset | literal |

**Fronteras** (`core/boundaries.ts`), calculadas sobre el grafo de `imports`:

- `client-entry`: cada island y, en 2.x Vite, `client.ts`. `client`: todo módulo alcanzable desde un client-entry por `imports` estáticos (los estáticos siempre entran al bundle; un `import()` dentro de un guard `IS_BROWSER` se marca `inferred`).
- `server-only` (señales): acceso a miembros de `Deno.` (incluido `Deno.env`; la única excepción es el patrón literal `Deno.env.get("FRESH_PUBLIC_X")`, que Fresh 2 inlinea en el bundle), imports `node:*` (es la regla built-in `checkImports` del plugin de Vite: "Node built-in modules cannot be imported in the browser", con la cadena de importadores), `@std/fs`, `@std/io` (`@std/path` es isomórfico → no), `$std/dotenv`, drivers (`postgres`, `mysql`, `mongodb`, `redis`, `npm:pg`, `deno-postgres`), `Deno.openKv`, y el propio `main.ts`/`utils.ts` si importan `fresh` (`App`). Lista extensible en `.fresh-dev/config.json` (`serverOnlySpecifiers`, `browserOnlySpecifiers`) — read-only para el MCP, la edita el usuario; en 2.x se puede sugerir al usuario la misma lista como `checkImports` del plugin de Vite.
- `browser-only`: uso libre de `window`, `document`, `localStorage`, `navigator` fuera de `IS_BROWSER`/`typeof window` guard o de un hook/effect.
- **Violación** = módulo `client` con señal `server-only` (con la cadena island → … → módulo), o route/middleware/layout (server) con señal `browser-only` sin guard (warning).
- `shared` = alcanzable desde islands y desde routes sin señales.

### 4.4 Rutas — reglas por versión (verificadas en `packages/fresh/src/{fs_crawl,router,fs_routes,define,context,app}.ts` y en `1.7.3/src/{dev/mod,server/fs_extract,server/types}.ts`)

Común a ambas (`pathToPattern`, mismo algoritmo): `index` final se elimina (`index.tsx` → `/`); `[id]` → `:id`; `[...rest]` → `/:rest*`; `[[opt]]` (segmento completo) → `{/:opt}?` (si es el primer segmento y no hay otro obligatorio: `/{:name}?`); `(group)/` se elimina de la URL; literales mixtos permitidos (`[id]-asdf`, `[id]@[bar]`); `][` adyacentes lanzan `SyntaxError`; `config.routeOverride` sustituye el patrón completo; los patrones son `URLPattern`; **estático gana a dinámico, dinámico en orden de registro**. Nombres especiales: `_app`, `_layout`, `_middleware`, `_404`, `_500`, y `_error` (solo 2.x). Cualquier directorio `(_xxx)/` se excluye de rutas; `(_islands)/` registra islands. Extensiones `tsx|jsx|ts|js` únicamente; se ignora `/[._]test\.(?:[tj]sx?|[mc][tj]s)$/`.

Orden de registro (`sortRoutePaths`), que `fresh_trace` debe reproducir:
- 2.x: `_app` primero; luego por segmento `_middleware`(6) > `_layout`/otros `_`(5) > `_error`(4) > `index`(3) > literal(2) > `(group)` (entre literal y `[`) > `[param]`(1) > `[...rest]`(0).
- 1.x: `_app` primero; `_middleware`(4) > `_`(3) > literal(2) > `[`(1) > `[...`(0). Dos archivos con el mismo nombre y distinta extensión → `Route conflict detected` al generar el manifest (base de R006).

Fresh 1.x: fuente de verdad = `fresh.gen.ts` (`manifest.routes`/`manifest.islands`), **cruzada** con el disco (`dev.ts` regenera el manifest al arrancar; discrepancias → R008). Exports de ruta: `handler: Handler | Handlers` (`(req, ctx)`; objeto por método o función), `default` (page), `config: RouteConfig {routeOverride, csp, skipInheritedLayouts, skipAppWrapper}`; **un export `handlers` lanza** `Found named export "handlers" … Did you mean "handler"?`; si hay componente y no `GET`, Fresh sintetiza `GET → ctx.render()` y `HEAD`. `_middleware.ts` → `handler: MiddlewareHandler | MiddlewareHandler[]` (`(req, ctx)`), orden raíz → hoja, `ctx.destination` (`internal|static|route|notFound`). `_layout.tsx` (sí existe en 1.x) → `default` `({Component, state})` o `defineLayout`; `_app.tsx` → `defineApp`; `_404.tsx`/`_500.tsx`; cualquier otro `/_*` en la raíz se ignora. `FreshContext`: `url, basePath, route, params, state, data, error, destination, isPartial, render(data, options), renderNotFound(data), Component, next()`. Los plugins (`fresh.config.ts`) pueden inyectar `routes`, `middlewares` (se fusionan como `./routes/<path>/_middleware.ts` sintéticos) e `islands`.

Fresh 2.x: no hay manifest; el crawler (`fs_crawl.ts`, usado por el plugin de Vite y por `Builder`) construye la tabla, y `main.ts` la inserta con `app.fsRoutes(pattern = "*")` (puede montarse bajo un sub-path; no anidable). Rutas programáticas en `main.ts` (orden de registro importa, de arriba abajo): `app.use(...mw)` / `app.use(path, ...mw)`, `app.get/post/patch/put/delete/head/all(path, ...mw)` (**no existe `.options()`** aunque la doc lo liste), `app.route(path, route|lazy, config)`, `app.layout(path, C, {skipInheritedLayouts, skipAppWrapper})`, `app.appWrapper(C)`, `app.notFound(x)` (solo raíz), `app.onError(path, x)` (por segmento), `app.ws(path, handlers)`, `app.mountApp(path, app)`; middlewares/handlers pueden ser lazy (`async () => (await import("./mw.ts")).default`) → arista `inferred`. Exports de archivo (`FreshFsMod`): `config?: RouteConfig {routeOverride, csp, skipInheritedLayouts, skipAppWrapper, methods}`, `handler?`/`handlers?` (**`handlers` gana**; función `(ctx)` u objeto `{HEAD|GET|POST|PATCH|PUT|DELETE|OPTIONS}`; una función con `length > 1` es error de arranque), `default?` (page, `define.page`; async puede devolver `Response`), `css?: string[]` (CSS extra por ruta). Archivo válido = `default` función, o `config` objeto, o `handler(s)`; si no: `Could not find relevant exports` (base de R002). `_middleware.ts`: `default` (fn o array, `define.middleware`) o `handler(s)` (fn o array); **objeto por método rechazado** (R014). `_layout.tsx`: `default` (`define.layout`); un `handler` en layout solo avisa. `_error.tsx`/`_500.tsx`: `component|config|css|handler` (por segmento; `throw new HttpError(404)` reemplaza a `renderNotFound`); `_404.tsx`: solo raíz. `_app.tsx`: `default`. Quirk verificado: el crawler decide carga eager/lazy con `code.includes("routeOverride")` (substring literal). Posible bug de `_500` anidado (patrón truncado) — no verificado en runtime. `Context` (alias deprecado `FreshContext`): `config, url, req, route, params, state, data, error, info, isPartial, next(), Component, redirect(path, status=302)` (colapsa `//`), `render(vnode, init?, layoutConfig?)`, `text()/html()/json()/stream()`, `upgrade()`; `PageProps` = `Pick<Context, config|url|req|params|info|state|isPartial|Component|error|route> & {data}`. `createDefine<State>()` devuelve `{handlers, page, middleware, layout}` (funciones identidad; la doc menciona `define.handler()` por errata). Built-ins de `fresh`: `staticFiles()` (**obligatorio** o no se sirve el JS de islands, R020), `trailingSlashes()`, `cors()`, `csrf()`, `csp()`, `ipFilter()`, `HttpError`, `page()`.

Middleware/layout 2.x (`segments.ts`): el árbol de segmentos se recorre raíz → hoja; por segmento primero se instalan su app wrapper/layout/error route y luego corren sus middlewares; `app.use()` globales corren en orden de registro; los layouts se acumulan exterior → interior; `skipInheritedLayouts` deja solo el propio; `skipAppWrapper` quita el wrapper; `RouteConfig` del route hace lo mismo al renderizar. 404 (`_404`/`notFound`) solo se usa cuando el `HttpError.status === 404`.

`static/`: 1.x se sirve automáticamente **antes** que las rutas; 2.x lo sirve `staticFiles()` en la posición donde esté en `app.use` (normalmente primero). 2.x: los archivos **importados** desde código (CSS) viven fuera de `static/` (`assets/`) y se importan desde `client.ts`; los referenciados por URL siguen en `static/`; `asset()` añade `__frsh_c=BUILD_ID`. Partials: `<Partial name mode>` de `fresh/runtime` (1.x `$fresh/runtime.ts`), `f-client-nav`, `f-partial`, `?fresh-partial=true` → `ctx.isPartial`; 2.x añade `f-view-transition`.

### 4.5 Índice e invalidación

- `Index` por workspace: `files: Map<path, {hash, mtime, size, facts}>`, `graph`, `routes`, `boundaries`, `builtAt`, `denoVersion`.
- Cada llamada de tool hace un `stat` barato del árbol (`routes/`, `islands/`, `components/`, `deno.json`, `fresh.gen.ts`, `vite.config.ts`, `main.ts`) y re-parsea solo archivos cuyo `mtime+size` cambió (hash SHA-256 con `crypto.subtle` para confirmar). El grafo derivado se recalcula entero (proyectos Fresh: cientos de archivos, < 300 ms).
- El hook `invalidate-graph` deja un marcador `<workspace>/.fresh-dev/dirty.json` (`{paths:[…], at}`) para que el servidor no dependa de mtimes cuando la edición vino de otro proceso; además, un segundo handler `type: "mcp_tool"` (`server: "plugin:fresh-dev:fresh"`, `tool: "fresh_reindex"`, `input: {workspace: "${cwd}"}`) reindexa en caliente cuando el servidor está conectado (§8).
- Cache en disco opcional: `<workspace>/.fresh-dev/index.json` (para que `fresh-mcp` CLI y los hooks no re-parseen). `.fresh-dev/` se recomienda en `.gitignore` **excepto** `graph.json` si el equipo quiere versionarlo (LiveSpec lo lee de disco).

### 4.6 Tools (todas: `workspace: string` obligatorio; errores como `{ok:false, error, hint, did_you_mean?}` estilo LiveSpec `mcp_error`)

| Tool | Args | Devuelve | Para qué |
|---|---|---|---|
| `fresh_project` | `workspace` | detección (§4.2) + conteos (routes/islands/components/middlewares/layouts) + tasks + `deno --version` + estado del índice + `apps[]` si es workspace Deno | primer contacto; lo llama el hook de sesión y `/fresh-dev:init` |
| `fresh_routes` | `workspace`, `kind?` (`page`\|`api`\|`middleware`\|`layout`\|`special`), `prefix?`, `summary_only?`, `limit=100`, `offset=0` | tabla de rutas: `pattern, file, kind, methods, hasPage, group, layouts[], middlewares[], islands[], config` | mapa del sitio; validar dónde va una ruta nueva |
| `fresh_route` | `workspace`, `pattern` **o** `file` | una ruta completa: cadena `app → layouts → middlewares → handler → page`, `passes_data` (tipo `Data` si literal), `renders` directos, `hydrates` (islands), imports directos, `boundary` del archivo, `tests` que la citan (grep de pattern/file en `**/*_test.ts\|*.test.ts`) | antes de tocar una ruta |
| `fresh_islands` | `workspace`, `name?`, `summary_only?` | islands: `file, exports, props (serializabilidad), usedBy (routes/components), clientClosure (n archivos, tamaño), violations[]` | añadir/cambiar interactividad |
| `fresh_components` | `workspace`, `name?`, `only: server\|client\|shared?` | componentes: `file, exports, usedBy, boundary, reachableFromIslands` | reutilizar en vez de duplicar |
| `fresh_dependencies` | `workspace`, `file`, `direction: imports\|importers = imports`, `depth=1`, `include_external=true` | subgrafo de imports resuelto (import map aplicado) con `external[]` (`specifier`, `kind: jsr\|npm\|https\|node`) | entender qué arrastra un archivo |
| `fresh_usages` | `workspace`, `target` (`file` o `file::Export`) | dónde se usa: `imports` (archivo, línea) y `jsxUses` (archivo, línea, prop names) | renombrar/mover con seguridad; complementa `findReferences` del LSP (que no ve JSX por nombre importado con alias) |
| `fresh_impact` | `workspace`, `files?: string[]` **o** `git: {base, head?}` (usa `git diff --name-only`), `depth=3` | `routes[]` afectadas (con por qué: `renders`/`wraps`/`guards`/`imports` chain), `islands[]` (bundle cliente cambia), `middlewares/layouts` tocados → rutas bajo su scope, `boundaryRisks[]`, `suggestedChecks` (`deno check <files>`, `deno lint`, tests relacionados, `fresh_validate` categorías) | planear un cambio; brief para agentes; PR review |
| `fresh_trace` | `workspace`, `path` (`/blog/hola?x=1`), `method=GET` | `matched: {route, pattern, params}`, `chain[]` ordenada (`app`, `layout`, `middleware` con scope, `handler`, `page`), `islands[]` hidratadas, `staticMatch?` (1.x: `static/` gana siempre; 2.x: según la posición de `staticFiles()` en `app.use`), `partials?`, `notFound?` (qué `_404`/`_error` aplica) | debugging "¿por qué esta URL hace X?" |
| `fresh_boundaries` | `workspace`, `only_violations=true` | clasificación por módulo + violaciones con cadena `island → … → módulo` y señal | revisar server/client antes de mover código |
| `fresh_validate` | `workspace`, `categories?: ("routes"\|"islands"\|"boundaries"\|"dependencies"\|"conventions")[]`, `files?`, `external?: {deno_lint?: bool, deno_check?: bool}` (default `false`; ejecutan `deno lint --json` con tag `fresh` y `deno check` y fusionan) | `{ok: boolean, findings[{id, severity: error\|warning\|info, category, file, line, col, message, hint, confidence}], summary{errors, warnings, info, unverified[]}}` | gate; hook de feedback; `/fresh-dev:validate` |
| `fresh_graph_export` | `workspace`, `path=".fresh-dev/graph.json"`, `relations?` | escribe node-link JSON (§11), devuelve `{path, nodes, links, byRelation, livespecSnippet}` | alimentar LiveSpec |
| `fresh_reindex` | `workspace`, `force=false` | stats del índice (`files, parsed, reused, ms`) | hooks; `/fresh-dev:analyze --fresh` |

Convenciones de salida: `ok: true` en éxito (Vise `CapabilityValidator` pasa con `ok:true` y falla con `ok:false`/`error`); paths relativos POSIX; nada de contenido de archivos completo (máx. 3 líneas de contexto por finding); `truncated: true` + `next_offset` cuando aplique.

---

## 5. Validators (`mcp/validators/`, expuestos por `fresh_validate` y por el CLI `fresh-mcp validate`)

Cada regla: `id`, `category`, `severity`, `versions: ["1","2"]`, `check(ctx) → Finding[]`, y un fixture que la dispara y otro que no. Sin autofix (read-only). Catálogo inicial:

| ID | Sev | Regla | Versión |
|---|---|---|---|
| **routes** ||||
| R001 | error | Archivo de ruta con nombre inválido (espacios, mayúscula inicial en segmento dinámico, `[]` vacío, `[...x]` no al final) | 1,2 |
| R002 | error | Ruta sin `handler` ni `default` export (no hace nada) | 1,2 |
| R003 | error | Ruta `.ts` (API) con JSX o `default` que devuelve JSX | 1,2 |
| R004 | error | `handler(s)` objeto con claves fuera de `HEAD\|GET\|POST\|PATCH\|PUT\|DELETE\|OPTIONS` | 1,2 |
| R005 | error | `_middleware.ts` sin export `handler` (1.x) / sin `define.middleware`/`handler` (2.x) | 1,2 |
| R006 | error | Dos archivos producen el mismo patrón (`foo.tsx` y `foo/index.tsx`; dos `routeOverride` iguales) | 1,2 |
| R007 | warning | Dos segmentos dinámicos hermanos con nombres distintos (`[id].tsx`, `[slug].tsx`) — orden indefinido | 1,2 |
| R008 | error | `fresh.gen.ts` desincronizado con el disco (ruta/island en disco ausente en manifest o viceversa) → `deno task manifest` | 1 |
| R009 | warning | `config.routeOverride` no literal (no analizable) → `confidence: inferred` | 1,2 |
| R010 | warning | 2.x: usa `define.*` sin importar `define` desde el `utils.ts` del proyecto (o define distinto por archivo → `State` inconsistente) | 2 |
| R011 | info | `_layout.tsx` con `skipInheritedLayouts` y sin layouts padre (no-op) | 1,2 |
| R012 | error | 2.x: `handler(s)` función con 2 parámetros `(req, ctx)` (estilo 1.x) → error de arranque `Handlers must only have one argument` | 2 |
| R013 | error | 1.x: export `handlers` (Fresh 1 solo acepta `handler` y lanza al arrancar) | 1 |
| R014 | error | 2.x: `_middleware.ts` con objeto por método (`{GET(){…}}`) → rechazado | 2 |
| R015 | warning | 2.x: `_layout.tsx` con export `handler` (Fresh avisa y lo ignora) | 2 |
| R016 | error | `_app.tsx` sin `default` | 1,2 |
| R017 | error | 2.x Vite: `main.ts` llama a `app.listen()` (colisiona con `deno task dev/start` → `AddrInUse`) | 2 |
| R018 | error | Archivo bajo `routes/` o `islands/` con extensión que el crawler no lee (`.mts`, `.mjs`, `.cts`) → nunca será ruta/island | 1,2 |
| R019 | info | Archivo bajo `routes/` que coincide con el patrón de test (`*_test.ts`, `*.test.tsx`) → ignorado por diseño | 1,2 |
| R020 | error | 2.x: `main.ts` sin `app.use(staticFiles())` → no se sirve el JS de las islands ni `static/` | 2 |
| **islands** ||||
| I001 | error | Archivo island sin ninguna función exportada (en ambas versiones cada función exportada es una island; `default` no es obligatorio) | 1,2 |
| I002 | error | Prop de island no serializable. **2.x** acepta: `null/undefined/boolean/number(NaN, ±Infinity, -0)/bigint/string`, arrays, objetos planos, `Uint8Array`, `URL`, `Date`, `RegExp`, `Set`, `Map`, `Temporal.*`, `Signal` (vía `.peek()`), computed (valor estático), JSX/`ComponentChildren`, referencias circulares; **rechaza** funciones (`Serializing functions is not supported`), instancias de clase, `Symbol`, `WeakMap/WeakSet`, streams, promesas. **1.x** acepta solo `null/boolean/number/bigint/string`, arrays, objetos planos, `Uint8Array`, `Signal`, JSX únicamente como `children`; **rechaza** además `Date`, `Map`, `Set`, `RegExp`, `URL` (pasar ISO strings) | 1,2 |
| I003 | error | Island que alcanza (transitivamente) un módulo server-only (delegado a B001 con `via: island`) | 1,2 |
| I004 | error | Componente en `components/`/ruta con `onClick`/`onInput`/`useState`/`useSignal`/`useEffect` → no se hidrata (equivale a `deno lint` `fresh-server-event-handlers`) | 1,2 |
| I005 | warning | Island consumida a través de un barrel (`components/index.ts` re-exporta desde `islands/`) → el uso JSX no se atribuye a la island por import directo; se reporta con `confidence: inferred` (no verificado en runtime cómo lo trata el bundler) | 1,2 |
| I006 | warning | Island demasiado grande (closure cliente > N archivos o incluye `components/` enteros por barrel) | 1,2 |
| I007 | error | Carpeta `(_islands)/` fuera de `routes/` (el crawler solo la reconoce bajo `routes/`) | 1,2 |
| I008 | warning | Island que usa `window`/`document`/`navigator` fuera de `IS_BROWSER`/`useEffect` (las islands también se renderizan en servidor) | 1,2 |
| **boundaries** ||||
| B001 | error | Módulo alcanzable desde una island importa señal server-only (`Deno.*`, `node:`, drivers, `$std/dotenv`, KV) | 1,2 |
| B002 | warning | Módulo server (route/middleware/layout/app) usa `window`/`document`/`localStorage` fuera de guard `IS_BROWSER` | 1,2 |
| B003 | warning | `IS_BROWSER` importado desde el specifier equivocado (`$fresh/runtime.ts` en 2.x, `fresh/runtime` en 1.x) | 1,2 |
| B004 | info | Módulo `shared` sin señales pero con nombre `*.server.ts`/`db*` (convención rota) | 1,2 |
| **dependencies** ||||
| D001 | error | Import relativo a archivo inexistente (case-sensitive) | 1,2 |
| D002 | error | Specifier bare que no está en `deno.json` `imports` ni es `jsr:`/`npm:`/`https:`/`node:` | 1,2 |
| D003 | error | Mezcla `$fresh/` (1.x) con `fresh`/`@fresh/core` (2.x) | 1,2 |
| D004 | error | `compilerOptions.jsxImportSource` ≠ `preact`, o `jsx` ∉ {`react-jsx`, `precompile`} (2.x genera `precompile` + `jsxPrecompileSkipElements`; 1.x `react-jsx`) | 1,2 |
| D005 | warning | Dos versiones de `preact` o de `@preact/signals` en el import map (esm.sh + npm) | 1,2 |
| D006 | warning | Ciclo de imports que involucra `routes/` o `islands/` | 1,2 |
| D007 | info | Import de `npm:` en island sin `nodeModulesDir` (1.x) / dependencia que requiere `--allow-*` extra | 1 |
| **conventions** ||||
| C001 | warning | Página monolítica: route con > N líneas de JSX y sin componentes (de `COMPONENT_COMPOSITION.md`) | 1,2 |
| C002 | info | `_app.tsx` sin `<html lang>`/`<meta viewport>`/`<title>` | 1,2 |
| C003 | error | Tailwind 1.x: `static/styles.css` sin directivas, `tailwind.config.ts` sin `content` para `{routes,islands,components}`, plugin ausente en `fresh.config.ts`, deps npm ausentes (**portado** de `tailwind-validator.ts`) | 1 |
| C004 | error | Tailwind 2.x (verificado con `@fresh/init --tailwind`): `tailwindcss` + `@tailwindcss/vite` en `imports`, `tailwindcss()` en `vite.config.ts`, y el CSS importado desde `client.ts` (no desde `static/`) | 2 |
| C005 | info | `className` en vez de `class` (funciona en Preact; convención Fresh es `class`) | 1,2 |
| C006 | info | Ruta API sin manejo de método no soportado (devuelve 405) | 1,2 |
| C007 | warning | `deno.json` `lint.rules.tags` sin `"fresh"` (se pierden `fresh-server-event-handlers`, `fresh-handler-export`, `jsx-*`, `react-rules-of-hooks`…) | 1,2 |
| C008 | info | 2.x: `deno lint` reporta `fresh-handler-export` sobre `export const handlers` — la regla refleja 1.x; en 2.x `handlers` es el export preferido. `fresh_validate` lo marca como falso positivo al fusionar `deno lint` | 2 |
| C009 | info | 2.x Vite: CSS/archivos importados desde código dentro de `static/` (deben ir en `assets/` e importarse desde `client.ts`) | 2 |

Notas de diseño:
- Las reglas **no** duplican `deno lint`/`deno check`: I004 y C007 existen porque el resultado de `deno lint` solo llega si alguien lo ejecuta; con `external.deno_lint=true` `fresh_validate` los fusiona y marca la fuente (`source: "deno lint"`).
- Severidad `error` = rompe en runtime/build; `warning` = funciona pero es frágil; `info` = estilo/arquitectura. `ok` = sin `error`.
- `unverified[]`: archivos que no se pudieron parsear (sintaxis rota, tamaño > 2 MB) — se reportan, no se ocultan (lección P0 de LiveSpec: "el modo de falla caro no es el error, es el silencio").
- CLI: `fresh-mcp validate <workspace> [--json] [--category …] [--file …] [--deno-lint] [--deno-check]` → exit 0 si `ok`, 1 si hay `error`, 2 si no es proyecto Fresh, 3 si error interno. Es lo que `.vise/quality.yaml` ejecuta (§10.3).

---

## 6. Skills de conocimiento (8) — enseñan a razonar, no documentan APIs

Formato común (`skills/<name>/SKILL.md`, inglés, ≤ ~150 líneas; lo largo va a `references/`):

```yaml
---
name: fresh-routing
description: >-
  How to reason about routes in a Deno Fresh project (1.x and 2.x): file → URL pattern,
  layouts, middleware scope, route groups, handlers vs pages, API routes. Use when adding,
  moving or debugging anything under routes/, or when a URL does not resolve as expected.
  Always query the fresh MCP (fresh_routes / fresh_route / fresh_trace) before editing.
user-invocable: false
paths: "routes/**"
---
```

Cuerpo de cada skill = (1) **preguntas que hay que responder antes de tocar nada** y qué tool de `fresh` las responde, (2) **reglas de decisión** (1.x vs 2.x, cuándo island vs component, etc.), (3) **patrón de cambio mínimo** + cómo validar (`fresh_validate`, `deno check`, `deno lint`), (4) **trampas** con el ID de regla que las detecta, (5) precedencia: convenciones del repo > este skill (misma regla que `engineering-baseline`).

| Skill | `paths` | Procedimiento que enseña | `references/` |
|---|---|---|---|
| `fresh-development` | `routes/**,islands/**,components/**,deno.json` | El loop del plan: identificar ruta → componentes/islands afectados → dependencias → frontera server/client → patrón existente (usar `fresh_components`/`fresh_usages` antes de crear) → cambio mínimo → `fresh_validate` + `deno check`. Cómo pedir `workspace`. Cómo nombrar las skills `fresh-dev:*` en un brief a un subagente de Vise | `tools.md` (tabla de tools + ejemplos de llamada), `versions.md` (1.x vs 2.x en una página) |
| `fresh-routing` | `routes/**` | archivo→patrón, precedencia, groups, `routeOverride`, `_layout`/`_middleware` scope, API vs page, `fresh_trace` para "¿qué atiende esta URL?" | `routing-1x.md`, `routing-2x.md` |
| `fresh-islands` | `islands/**,routes/**/(_islands)/**` | cuándo algo debe ser island; props serializables; closure cliente (`fresh_islands`); islands anidadas; signals vs hooks; `IS_BROWSER`; por qué un `onClick` en `components/` no hace nada (I004) | `islands.md`, `serialization.md` |
| `fresh-components` | `components/**` | server components por defecto; reutilizar antes de crear (`fresh_components`, LiveSpec `search_similar` si está); dónde vive un componente compartido entre islands y rutas (frontera `shared`); composición vs monolito (C001) | `composition.md` (de `COMPONENT_COMPOSITION.md`, revisado) |
| `fresh-data-flow` | `routes/**` | handler → page: 1.x `ctx.render(data)` + `PageProps<Data>`; 2.x `page(data, {headers,status})`/`{data}` + `define.page<typeof handler>` (`ctx.render(vnode)` es para renderizar directamente); page → island props (tabla de serialización I002); `ctx.state` desde middleware con `createDefine<State>()`; formularios (POST + `ctx.redirect`, que colapsa `//`); `throw new HttpError(404)` (2.x) vs `ctx.renderNotFound()` (1.x); partials; qué **no** pasar a una island | `data-flow-1x.md`, `data-flow-2x.md` |
| `fresh-middleware` | `routes/**/_middleware.ts,main.ts` | orden raíz→hoja, `app.use()` global (2.x), `ctx.next()`, `ctx.state` tipado, auth/CORS/CSRF built-ins 2.x, errores comunes (R005) | `middleware.md` |
| `fresh-architecture` | `deno.json,main.ts,dev.ts,vite.config.ts,fresh.config.ts,fresh.gen.ts` | anatomía por versión, señales de detección, dónde va cada cosa, fronteras, cómo decidir dónde poner código nuevo, migración 1.x→2.x (solo diagnóstico) | `anatomy.md`, `boundaries.md`, `migration-1x-2x.md` |
| `fresh-debugging` | — (se dispara por descripción: "route 404", "island not interactive", "hydration", "styles not applied") | árbol de diagnóstico: URL no responde → `fresh_trace`; island muerta → `fresh_islands` + I003/I004; estilos → C003/C004; manifest stale → R008; tipos → `deno check`; luego LiveSpec/flowtrace si están | `symptoms.md` (de `COMMON_ISSUES.md`/`JSX_PITFALLS.md`, revisados para 2.x) |

Reglas de redacción (de Vise `CLAUDE.md`, aplican aquí): sin nombres de clientes/proyectos reales en ejemplos; ejemplos con vocabulario genérico (`routes/blog/[slug].tsx`), no con las apps de ejemplo; cada afirmación direccional ("X gana sobre Y") citando la fuente (doc oficial o `denoland/fresh` `src/…`).

---

## 7. "Commands" = skills invocables por el usuario (6)

`skills/<name>/SKILL.md` con `disable-model-invocation: true`. Invocación real: `/fresh-dev:<name>` (D5). Todas delegan el análisis al MCP; **ninguna implementa lógica propia**.

| Skill | `argument-hint` | Qué hace (cuerpo) | `allowed-tools` |
|---|---|---|---|
| `init` | `[workspace]` | 1) `fresh_project` sobre `$0` o `!`pwd``; si no es Fresh, dice qué señal faltó y para. 2) Muestra versión/flavor/conteos. 3) `fresh_reindex`. 4) Detecta vecinos por huella (`.vise/`, `.mcp-docs/docs.db`, `.livespec.toml`) y **propone** (no escribe sin confirmar) los snippets de `templates/`: `.vise/recipes/fresh-*.yaml`, `.vise/capabilities.yaml`, `.vise/quality.yaml` (checks `fresh`, `types`, `lint`, `fmt`, `unit`), `.livespec.toml` `[graph]`, `.gitignore` `.fresh-dev/`. 5) Recuerda que los hooks ya están activos | `mcp__*fresh*__*`, `Read`, `Bash(pwd)`, `Bash(ls:*)`, `Write` solo tras confirmación |
| `analyze` | `[--full]` | `fresh_project` + `fresh_routes(summary_only)` + `fresh_islands(summary_only)` + `fresh_boundaries(only_violations)` + `fresh_validate` resumido → informe de ≤ 40 líneas con siguientes pasos | `mcp__*fresh*__*` |
| `routes` | `[prefix\|kind]` | `fresh_routes` filtrado; tabla `pattern · kind · methods · layouts · middlewares · islands`; si se pasa una URL, `fresh_trace` | `mcp__*fresh*__*` |
| `impact` | `<file…\|git-ref>` | `fresh_impact` (archivos o `git: {base:$0}`); imprime rutas/islands afectadas, riesgos de frontera y **comandos de verificación sugeridos**; si LiveSpec está montado, sugiere `git_diff_impact` para el lado de símbolos | `mcp__*fresh*__*`, `Bash(git diff:*)` |
| `validate` | `[category…] [--deno]` | `fresh_validate` (+ `external` si `--deno`); agrupa por severidad; termina con `ok`/`not ok` y el comando CLI equivalente para CI | `mcp__*fresh*__*` |
| `debug` | `<symptom or URL>` | Carga `fresh-debugging`; si `$ARGUMENTS` parece URL → `fresh_trace`; si nombra una island → `fresh_islands(name)`; si no, árbol de síntomas; nunca edita | `mcp__*fresh*__*`, `Read`, `Grep` |

Nota sobre `allowed-tools`: el prefijo real de las tools MCP depende de la instalación (`mcp__plugin_fresh-dev_fresh__*` como plugin, `mcp__fresh__*` si se monta a mano). Usar patrón con comodín o **no** restringir (como hace el agente de LiveSpec) y verificar en fase 5.

---

## 8. Hooks (`hooks/hooks.json`) — mantener vivo el conocimiento Fresh

Todos: scripts Deno en `hooks/*.ts` lanzados por `bin/fresh-dev-run hook <name>`; solo reaccionan a `tsx|jsx|ts|js` (las extensiones que Fresh lee) y a los archivos de configuración; **exit 0 siempre**; si `deno` no existe, el launcher sale 0 sin imprimir (fail-open); `timeout` corto; nunca `exit 2`. Leen stdin JSON (`cwd`, `tool_name`, `tool_input.file_path`, `session_id`), respetan `CLAUDE_PROJECT_DIR`. Kill switch: `FRESH_DEV_HOOKS=off`.

| Hook | Evento / matcher | Hace | Salida |
|---|---|---|---|
| `detect-fresh` | `SessionStart` (`startup\|resume\|clear\|compact\|fork`), `CwdChanged` (sin matcher), `DirectoryAdded` (`slash_command\|register_repo_root`) — los tres existen en la referencia oficial de hooks | `detect.ts` sobre `cwd` (sin parsear código; < 100 ms). Si no es Fresh: silencio. Si lo es: bloque ≤ 12 líneas: versión/flavor, conteos, si `.fresh-dev/index.json` existe y su edad, y 3 instrucciones: usar `fresh_*` con `workspace=<abs>`, cargar `fresh-dev:fresh-development` antes de editar, **nombrar las skills `fresh-dev:*` en briefs a subagentes de Vise** (ellos no las cargan solos). En `compact` repite el bloque (la doc lo recomienda para re-inyectar contexto) | `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"…"}}` |
| `invalidate-graph` | `PostToolUse` matcher `Edit\|Write\|MultiEdit`, `if: "Edit(**/routes/**) \| Write(**/routes/**) \| Edit(**/islands/**) \| Write(**/islands/**) \| Edit(**/components/**) \| Write(**/components/**) \| Edit(**/deno.json) \| Edit(**/fresh.gen.ts) \| Edit(**/vite.config.ts) \| Edit(**/main.ts)"`; `PostToolUse` `Bash` cuando el comando contiene `git checkout\|git pull\|git merge\|git stash\|deno task manifest`; y `FileChanged` con matcher `deno.json\|fresh.gen.ts\|vite.config.ts` (cambios hechos fuera de Claude Code) | Handler 1 (`command`, `async`): anexa el path a `<workspace>/.fresh-dev/dirty.json`. Handler 2 (`mcp_tool`): `{"type":"mcp_tool","server":"plugin:fresh-dev:fresh","tool":"fresh_reindex","input":{"workspace":"${cwd}"}}` — solo actúa si el servidor ya está conectado (nunca dispara conexión) | nada |
| `validate-fresh` | `PostToolUse` `Edit\|Write\|MultiEdit`, `if` acotado a `**/routes/**`, `**/islands/**`, `**/components/**` | `fresh-mcp validate <ws> --file <path> --json --fast` (solo categorías islands/boundaries/routes sobre ese archivo; sin `deno check`). Si hay `error`/`warning`: ≤ 8 líneas (`I004 islands/Foo.tsx:12 …hint`). Si limpio: silencio. Nunca bloquea (es feedback, como `edit_feedback.py` de Vise) | `hookSpecificOutput.additionalContext` `{type:"text", text}` (PostToolUse lo admite según la referencia), `timeout: 5` |

Coexistencia con Vise: sus hooks también corren en `SessionStart`/`PostToolUse`; los nuestros no dependen de ellos y suman ≤ 12 líneas. Si `graph_enforcer` bloquea `Edit` en una fase read-only, nuestros hooks simplemente no se disparan.

---

## 9. LSP (`.lsp.json`)

```json
{
  "deno": {
    "command": "deno",
    "args": ["lsp"],
    "extensionToLanguage": {
      ".ts": "typescript", ".tsx": "typescriptreact",
      ".js": "javascript", ".jsx": "javascriptreact",
      ".mts": "typescript", ".mjs": "javascript"
    },
    "transport": "stdio",
    "initializationOptions": { "enable": true, "lint": true, "unstable": false },
    "startupTimeout": 15000, "restartOnCrash": true, "maxRestarts": 3
  }
}
```

- `deno lsp` lee `deno.json` del workspace (import map, `jsxImportSource`), así que `$fresh/`, `jsr:`, `npm:` resuelven. Verificado en docs.deno.com (`lsp_integration`): `initializationOptions` se interpreta como el namespace `deno.*` (`enable`, `enablePaths`, `config`, `importMap`, `lint`, `unstable`, `codeLens.*`, `suggest.*`, `cache`); con `enable: true` y sin `config` explícito descubre `deno.json` del workspace.
- `deno lint` con tag `fresh` (verificado con `deno lint --rules`, Deno 2.9.7): `fresh-handler-export`, `fresh-server-event-handlers`, `jsx-button-has-type`, `jsx-no-children-prop`, `jsx-no-comment-text-nodes`, `jsx-no-unescaped-entities`, `jsx-no-useless-fragment`, `jsx-void-dom-elements-no-children`, `react-no-danger`, `react-no-danger-with-children`, `react-rules-of-hooks`. Los plugins de lint de Deno solo corren dentro de `deno test`/`deno bench`, así que no sirven como API de parseo para el MCP.
- División de trabajo que el skill `fresh-development` explica: `LSP` tool (`goToDefinition`, `findReferences`, `goToImplementation`, `documentSymbol`, `incomingCalls`) = **símbolos**; `fresh_*` = **estructura Fresh** (una referencia JSX a un componente importado con alias, o "qué rutas cubre este middleware", el LSP no lo responde); `deno check`/`deno lint` = **errores** (el `LSP` tool de Claude Code no expone diagnósticos, según la skill `orchestration` de Vise; si el campo `"diagnostics": true` de `.lsp.json` los aporta, se documenta y **no** se duplican en `fresh_validate`).
- **Conflicto conocido:** si el usuario tiene instalado el plugin oficial `typescript-lsp`, dos plugins reclaman `.ts`/`.tsx` y Claude Code no arbitra. `README` y `/fresh-dev:init` lo avisan; `vise doctor` ya lo detecta (`plugin_conflicts.py`). No hay solución técnica desde este plugin.
- Vise `lsp_clean` usa `tsc` para TypeScript → en Deno da falsos positivos o "unverified". La alternativa correcta es `.vise/quality.yaml` `types: ["deno","check","."]` (§10.3) y, del lado de Vise, un follow-up para que `lsp_diagnostics` use `deno check` cuando exista `deno.json` (§10.5).

---

## 10. Integración con Vise

### 10.1 Cómo llega el conocimiento Fresh a los agentes de Vise

```
Vise orchestrator (main agent)
   │  SessionStart hook de fresh-dev le dijo: "name fresh-dev:* skills in briefs"
   │  fresh_impact / fresh_route → hechos que pega en el brief (path:line, no prosa)
   ▼
vise:frontend / vise:backend-typescript (subagente)
   │  brief: "Load the fresh-dev:fresh-islands skill before your first edit;
   │          workspace=/abs/path; the route is routes/blog/[slug].tsx (fresh_route output pasted)"
   ▼
Skill fresh-dev:fresh-islands → dice qué tools fresh_* consultar y qué validar
   ▼
fresh MCP → proyecto Fresh
```

No hay agentes propios (§2.3). Lo que sí se entrega: (a) skills con `description` que dispara por sí sola cuando el subagente toca `islands/**`, etc. (`paths`), (b) el recordatorio en el contexto de sesión, (c) recipes que enumeran las consultas previas.

### 10.2 Recipes (formato Vise, `fresh-dev/recipes/*.yaml`, capabilities `x.fresh.*`)

Capabilities que fresh-dev define (namespace de extensión, aceptado por `validate_capability`):

| Capability | Tool | Efecto |
|---|---|---|
| `x.fresh.project` | `fresh.fresh_project` | read |
| `x.fresh.routes` | `fresh.fresh_routes` | read |
| `x.fresh.route` | `fresh.fresh_route` | read |
| `x.fresh.islands` | `fresh.fresh_islands` | read |
| `x.fresh.components` | `fresh.fresh_components` | read |
| `x.fresh.usages` | `fresh.fresh_usages` | read |
| `x.fresh.impact` | `fresh.fresh_impact` | read |
| `x.fresh.trace` | `fresh.fresh_trace` | read |
| `x.fresh.boundaries` | `fresh.fresh_boundaries` | read |
| `x.fresh.validate` | `fresh.fresh_validate` | read |
| `x.fresh.export_graph` | `fresh.fresh_graph_export` | write (solo `.fresh-dev/`) |

`templates/vise/capabilities.yaml` (lo que `/fresh-dev:init` propone copiar a `.vise/capabilities.yaml`; formato `"<mcp>.<tool>": "<capability>"` según `capability_set`):

```yaml
fresh.fresh_project: x.fresh.project
fresh.fresh_routes: x.fresh.routes
fresh.fresh_route: x.fresh.route
fresh.fresh_islands: x.fresh.islands
fresh.fresh_components: x.fresh.components
fresh.fresh_usages: x.fresh.usages
fresh.fresh_impact: x.fresh.impact
fresh.fresh_trace: x.fresh.trace
fresh.fresh_boundaries: x.fresh.boundaries
fresh.fresh_validate: x.fresh.validate
fresh.fresh_graph_export: x.fresh.export_graph
```

Recipes (cada una: `inputs`, `steps` con `capability` + `args` con `{{ inputs.* }}`/`{{ steps.*.output.* }}`, último paso `meta.assert` cuando hay condición verificable). `recipe_run` devuelve el plan; Claude ejecuta; Vise controla la fase.

| Recipe | Pasos (capabilities) | Assert final |
|---|---|---|
| `fresh-feature` | `x.fresh.project` → `x.fresh.routes` (prefix del feature) → `x.fresh.components` (reuso) → `x.fresh.boundaries` → *(implementación fuera del recipe)* → `x.fresh.validate` | `match ^true$` sobre `steps.validate.output.ok` |
| `fresh-route` | `x.fresh.routes` (prefix) → `x.fresh.trace` (URL objetivo, confirma que hoy no la atiende otra ruta / R006) → *(crear)* → `x.fresh.route` (file) → `x.fresh.validate` (categories routes) | `ok` |
| `fresh-component` | `x.fresh.components` (name) → `x.fresh.usages` (si existe) → *(crear/editar)* → `x.fresh.validate` (conventions, boundaries) | `ok` |
| `fresh-island` | `x.fresh.islands` (name) → `x.fresh.boundaries` → *(crear/editar)* → `x.fresh.islands` (name: props serializables, closure) → `x.fresh.validate` (islands, boundaries) | `ok` y `violations == []` |
| `fresh-refactor` | `x.fresh.impact` (files) → `x.fresh.usages` (por símbolo movido) → *(mover)* → `x.fresh.impact` (git base) → `x.fresh.validate` | `ok` |
| `fresh-debug` | `x.fresh.trace` (URL) → `x.fresh.route` → `x.fresh.islands` (si aplica) → `x.fresh.validate` (file) | — (informe) |

Los pasos "*(implementación)*" no existen en el YAML: Vise no ejecuta y el recipe solo describe consultas; el skill `fresh-development` explica dónde encaja la edición entre pasos.

### 10.3 Quality gate (`templates/vise/quality.fresh.yaml` → `.vise/quality.yaml`)

```yaml
checks:
  lint:  ["deno", "lint"]
  fmt:   ["deno", "fmt", "--check"]
  types: ["deno", "check", "main.ts", "dev.ts"]      # 2.x: añadir vite.config.ts; 1.x: main.ts basta (importa fresh.gen.ts)
  unit:  ["deno", "test", "-A"]
  # fresh-dev structural validator (exit 1 on any error-severity finding)
  fresh: ["deno", "run", "-A", "<ABS_PATH_TO_PLUGIN>/mcp/cli.ts", "validate", ".", "--json"]
```

- `quality_check` ejecuta argv **sin shell** y con el PATH del proceso de Vise → `deno` debe estar en ese PATH (o poner ruta absoluta `~/.deno/bin/deno`). `<ABS_PATH_TO_PLUGIN>` lo rellena `/fresh-dev:init` (`${CLAUDE_PLUGIN_ROOT}` no se expande en `quality.yaml`); cuando el CLI esté en JSR: `["deno","run","-A","jsr:@rixmerz/fresh-mcp@<ver>/cli","validate","."]`.
- Nodo de workflow: `quality-gate-graph.yaml` no gatea por `fresh`; para usarlo en un workflow propio del proyecto: `validators: [{type: quality_check, check: fresh, weight: 1.0}]`. Requiere `vise approve fresh` en la máquina (consentimiento de Vise).
- No usar `{type: capability, capability: x.fresh.validate}` como gate: Vise no dispatcha y el gate siempre fallará pidiendo ejecutar a mano.

### 10.4 `/fresh-dev:init` y la huella `.fresh-dev/`

- `.fresh-dev/config.json` (opcional, lo edita el usuario): `serverOnlySpecifiers`, `browserOnlySpecifiers`, `ignore` (globs), `maxFileBytes`.
- `.fresh-dev/index.json`, `.fresh-dev/dirty.json`, `.fresh-dev/graph.json`, `.fresh-dev/warnings.jsonl` (findings del hook `validate-fresh`, para auditar falsos positivos como hace `/codelayer warnings`).

### 10.5 Follow-ups del lado de Vise (fuera del alcance de este plugin; abrir issues en `Rixmerz/vise`)

1. `lsp_diagnostics`: usar `deno check`/`deno lint --json` cuando exista `deno.json` en vez de `tsc` (hoy `lsp_clean` es inválido en Deno).
2. `CAPABILITY_EFFECT`: tratar `x.*` con sufijo declarado como `read` (o leer un `effect:` del `capabilities.yaml`) para que `x.fresh.*` sea usable en loops L1.
3. `neighbour_state`: reconocer la huella `.fresh-dev/index.json` y nombrar `fresh-dev` en la tabla de Neighbours de `orchestration/SKILL.md` ("estructura Fresh: rutas, islands, fronteras").
4. `CAPABILITY_WORDS`/fleet: `frontend` ya cubre Fresh; no hace falta agente nuevo. Añadir a `agents/frontend.md` la fila "`.tsx` en un proyecto con `deno.json` + `routes/` → cargar también `fresh-dev:fresh-development`" cuando el plugin esté publicado.

---

## 11. Integración con LiveSpec

### 11.1 Qué se publica y por qué canal

`fresh_graph_export` escribe `<workspace>/.fresh-dev/graph.json` en formato **Graphify node-link** (lo único que `ingest_external_graph` lee). LiveSpec **solo conserva aristas entre símbolos que él mismo extrajo** (`map_nodes_to_symbols`: match por `(source_file, line)` y por `(source_file, label)`), así que:

- **Nodos** = símbolos de nivel superior que LiveSpec también ve con tree-sitter TS (`domain/extractors.py` `_ts_extract`): funciones/clases con nombre, arrow functions asignadas a `const` (`variable_declarator`), métodos de objeto literal (`{ GET(ctx) {…} }` es `method_definition` → símbolo `GET`; la propiedad `handler` en sí **no** es símbolo), y `export default` anónimo, al que LiveSpec **acuña el nombre del basename del módulo** (`export default function() {}` en `routes/blog/[slug].tsx` → `[slug]`; `export default function Page()` → `Page`). `id` = `"<path>::<name>"`, `label` = ese mismo nombre, `source_file` = path relativo idéntico al que LiveSpec indexa (sin `./`), `source_location` = `"L<start_line>"` de la declaración (el match por `(source_file, line)` es el robusto; el de `(source_file, label)` es el respaldo), `_callable: true`, `_origin: "ast"`.
- **Aristas** (relación → `edge_type` en LiveSpec):
  - `renders` → `uses_component` (→ `references`): `Page` → `Hero`. Es la que LiveSpec no puede inferir (JSX no genera call edge en su extractor).
  - `hydrates` → `uses_component` con `confidence: "INFERRED"` (transitiva).
  - `handles`/`passes_data`: handler → page dentro del mismo archivo → `uses` (→ `references`).
  - `wraps`/`guards`: `_layout`/`_middleware` → page/handler de cada ruta bajo su scope → `uses` con `INFERRED` (LiveSpec no modela scope por directorio; con esto `who_calls(Page)` muestra el layout y `analyze_impact(_middleware)` alcanza las rutas). Opcional vía `relations` (puede inflar el grafo en sitios grandes; `summary_only` primero).
  - `imports` → `imports` (**off por defecto** en LiveSpec; se emiten para que `find_dead_code(corroborate_with=…)` los use).
- **No se exporta** (no cabe en el modelo de LiveSpec): patrón de URL, kind de ruta, métodos, fronteras, assets, externals. Eso lo responde fresh-mcp; el skill `livespec` de LiveSpec y la skill `fresh-development` explican la división.

Todas las aristas llevan `confidence` (`EXTRACTED`/`INFERRED`) y `confidence_score`; nunca `1.0` (LiveSpec tapa a 0.9).

### 11.2 Configuración

`templates/livespec/livespec.toml.snippet` (lo propone `/fresh-dev:init`):

```toml
[graph]
external = ".fresh-dev/graph.json"
auto_ingest = true          # re-ingesta tras cada index_project
```

Flujo: `fresh_graph_export` → `index_project(workspace)` (LiveSpec) → ingesta automática (o `ingest_external_graph(dry_run=false)` a mano). El hook `invalidate-graph` **no** exporta solo (escribir en cada edición es ruido); exporta `/fresh-dev:analyze --full`, `fresh-mcp export` en CI, o el usuario. `ingest_external_graph` reporta `skipped.endpoint_not_indexed` y `unknown_relations`: el CLI `fresh-mcp export --check` compara con `.mcp-docs/docs.db` (solo lectura de `index_run`, como hace Vise) y avisa si LiveSpec no ha indexado.

### 11.3 Follow-ups del lado de LiveSpec (issues en `Rixmerz/livespec`)

1. `route_ref` para Fresh: `routes/api/**/*.ts` (y handlers `GET/POST` de páginas) como `role='server'` con `method` + `path` derivados del filesystem → habilita `invokes_route`/`find_legacy_flows` para Fresh como ya existe para Hono/Express. fresh-mcp puede entregar la tabla (`fresh_routes`) para que LiveSpec no reimplemente el mapeo.
2. `find_endpoints(framework="fresh")` hoy lista islands; debería listar rutas (input: la misma tabla).
3. Ingesta de nodos "file-level" o de atributos (`kind: route`, `pattern`) si algún día LiveSpec acepta metadatos externos por símbolo (hoy `ingest_external_graph` solo escribe `symbol_edge`).

---

## 12. Detección automática — flujo completo

```
SessionStart / CwdChanged
  └─ hooks/detect_fresh.ts (≤100 ms, sin parse)
       ├─ no deno.json{,c}            → silencio
       ├─ deno.json sin señal Fresh    → silencio
       └─ Fresh (1.x | 2.x | ambiguo)
            ├─ additionalContext (≤12 líneas: versión, conteos, cómo usar fresh_*, skills en briefs)
            └─ (no indexa aquí: el índice se construye en la 1ª llamada a una tool o en /fresh-dev:init)
1ª tool call (workspace=…)
  └─ core/detect.ts (completo) → scan → parse → graph → boundaries → índice en memoria (+ .fresh-dev/index.json)
Edición (PostToolUse) → dirty.json / fresh_reindex → siguiente tool re-parsea solo lo cambiado
```

Falsos positivos a cubrir con `fixtures/not-fresh/`: proyecto Deno + Vite sin Fresh; Remix/SvelteKit (tienen `routes/` pero no `deno.json`); monorepo Deno con una app Fresh en subcarpeta (→ `apps[]`).

---

## 13. Tests, fixtures y evals

- **Unit/golden** (`deno test`): por fixture, snapshots JSON de `fresh_project`, `fresh_routes`, `fresh_islands`, `fresh_boundaries`, `fresh_validate`, `fresh_graph_export`; cada regla de §5 con su fixture positivo y negativo; `fresh_trace` con tabla de URLs esperadas por fixture (incluye precedencia estática/dinámica/catch-all y route groups).
- **Fixtures**: las 6 apps 1.7.3 existentes (movidas), `fresh-1.x-layered` y `fresh-2.x-layered` creadas a mano (mínimas: ~15 archivos cada una, cubriendo layouts anidados, middleware anidado, groups, `[...rest]`, `[[opt]]`, islands anidadas y con exports nombrados, `(_islands)/`, `_error.tsx`, `app.use` global y por path, `mountApp`, `routeOverride`, `css` export, un módulo server-only alcanzado por una island para B001, un `node:` import para reproducir el `checkImports` de Vite), `fresh-2.x-basic` generado con `deno run -Ar jsr:@fresh/init … --no-tailwind --vscode --no-docker` (commiteado tal cual, con `deno.lock`; `node_modules/` va en `.gitignore` porque `nodeModulesDir: "manual"` + `deno install`), `fresh-2.x-builder` (`--builder`), `not-fresh`.
- **Contrato con LiveSpec**: test que ejecuta `livespec index` + `ingest_external_graph(dry_run=true)` sobre `fresh-2.x-layered` y afirma `mapped_nodes > 0`, `skipped.unknown_relation == 0` (requiere `uvx livespec@0.32.0`; marcado `--ignore` si no está; en CI se instala).
- **Contrato con Vise**: `vise recipe run fresh-route --input …` sobre el fixture devuelve un plan sin `unresolved` cuando `.vise/capabilities.yaml` del template está presente (requiere vise instalado; opcional en CI).
- **Evals** (`fresh-dev/evals/`, `claude plugin eval .`): por skill/command un caso: p. ej. `add-route` (prompt: "add /pricing page" sobre fixture → graders `tool_used: fresh_routes`, `tool_order: fresh_routes before Write`, `llm`: "did it check for an existing conflicting route?"); `dead-island` (síntoma → `tool_used: fresh_islands`, regex `I004`); `session-detect` (`file_exists` no aplica; `llm` sobre el primer mensaje mencionando versión). Umbral inicial 0.8, `runs: 3`.
- **CI** (`.github/workflows/ci.yml`): `denoland/setup-deno@v2` (2.x) → `deno fmt --check`, `deno lint`, `deno check mcp/**/*.ts`, `deno test -A`; job opcional `livespec-contract` con `uv`; evals manuales (`workflow_dispatch`) porque consumen tokens.

---

## 14. Fases — orden ajustado, entregables y criterios de aceptación

| Fase | Entregable | Criterio de aceptación | Depende de |
|---|---|---|---|
| **0. Higiene del repo** | Rotar y eliminar la key de Pexels; mover generador a `legacy/fresh-mcp-server/`; mover apps a `fixtures/fresh-1.x/`; borrar `.serena/`, screenshots, reports sueltos; `.gitignore` (`.claude.json`, `.fresh-dev/`, `.mcp-docs/`); README raíz nuevo; CI base | `git grep -i pexels_api_key` vacío; CI verde en `main` | — |
| **1. Detección** | `mcp/core/detect.ts` + `hooks/detect_fresh.ts` + `fixtures/not-fresh` + `fresh-2.x-basic` | 100 % de fixtures clasificados; `not-fresh` silencioso; hook < 100 ms; SessionStart inyecta el bloque en un proyecto Fresh real | 0 |
| **2. Fresh MCP (núcleo)** | `main.ts` stdio, `fresh_project`, `fresh_routes`, `fresh_route`, `fresh_islands`, `fresh_components`, `fresh_dependencies`, `fresh_usages`, `fresh_boundaries`, `fresh_trace`, `fresh_reindex`; índice incremental; fixtures layered; rango soportado fijado y comprobado contra el código fuente (`@fresh/core >=2.3 <3`, `fresh@1.7.x`) | golden tests verdes en 1.x y 2.x; `fresh_trace` acierta la tabla de URLs; `bin/fresh-dev-run` arranca con `npx @modelcontextprotocol/inspector`; respuestas < 16 KB con `summary_only` | 1 |
| **3. Skills** | 8 skills + `_shared/references/` (revisando los docs 1.x existentes para 2.x) | `claude plugin eval` de 3 casos ≥ 0.8; `/skill-doctor` sin warnings de descripción; revisión humana de cada SKILL.md contra el checklist de §6 | 2 |
| **4. Validators + CLI** | 30 reglas de §5, `fresh_validate`, `mcp/cli.ts`, `bin/fresh-mcp`, `templates/vise/quality.fresh.yaml` | cada regla con fixture +/−; CLI exit codes; `deno lint`/`deno check` fusionados con `external`; `.vise/quality.yaml` `fresh` pasa por `quality_check` en el fixture | 2 |
| **5. Commands (skills de usuario) + publicación** | `init/analyze/routes/impact/validate/debug`; `fresh_impact`; marketplace local; PR a `Rixmerz/claude-plugins` | instalación limpia desde el marketplace en una máquina sin el clone; nombres reales de tools documentados; `/fresh-dev:init` propone (no escribe) los templates | 3, 4 |
| **6. Hooks completos** | `invalidate-graph`, `validate-fresh`, `.fresh-dev/warnings.jsonl` | edición en `islands/` produce feedback ≤ 8 líneas en < 2 s; nunca bloquea; con `FRESH_DEV_HOOKS=off` inertes; coexistencia con Vise verificada | 4 |
| **7. LSP** | `.lsp.json` (`deno lsp`); documentación de conflicto con `typescript-lsp`; skill explica LSP vs fresh_* vs deno check | `goToDefinition` sobre `$fresh/`/`jsr:` resuelve en Claude Code; `vise doctor` no reporta doble reclamo cuando solo está fresh-dev | 5 |
| **8. LiveSpec** | `fresh_graph_export`, `templates/livespec/`, test de contrato | `ingest_external_graph(dry_run)` mapea > 90 % de nodos en `fresh-2.x-layered`, `unknown_relation == 0`; `who_calls(Page)` muestra layout/route tras ingesta | 2, 4 |
| **9. Recipes** | 6 YAML + `templates/vise/capabilities.yaml`; issues de follow-up en vise/livespec | `recipe_run` devuelve plan completo sin `unresolved`; `capability_audit` limpio con el template | 5, 8 |
| **10. Modificación semántica** (fuera de este plan) | tools de escritura (`fresh_create_route`, `fresh_move_component` con actualización de imports/`fresh.gen.ts`) | diseño aparte; requiere consentimiento explícito y snapshots (Vise) | 9 |

Cambios de orden respecto al plan original: la detección (hook mínimo) sube a fase 1 porque es barata y da valor inmediato; los validators van antes que los commands porque `/fresh-dev:validate` y el hook `validate-fresh` dependen de ellos; el LSP baja a fase 7 porque es un archivo de configuración y su valor depende de que los skills expliquen cuándo usarlo.

---

## 15. Riesgos, preguntas abiertas y qué decidir antes de empezar

**Preguntas para el usuario (bloquean nombre/publicación, no el desarrollo):**

1. ¿Plugin `fresh-dev` (→ `/fresh-dev:init`) o `fresh` (→ `/fresh:init`, como en el plan original)? Recomendación: `fresh-dev`.
2. ¿Se mantiene el generador Node como `legacy/` o se archiva en otro repo? Recomendación: `legacy/` sin cambios, README indicando que no evoluciona.
3. ¿Publicar el MCP en JSR (`@rixmerz/fresh-mcp`) en fase 5, o solo `git-subdir`? Recomendación: JSR en fase 5 (simplifica `quality.yaml` y CI).
4. ¿La key de Pexels sigue en uso en algún sitio? Hay que rotarla igualmente.

**Riesgos técnicos:**

| Riesgo | Mitigación |
|---|---|
| Semántica exacta de Fresh 2.3 (islands por export, precedencia de rutas, `_error.tsx`, `fsRoutes` API) cambia entre minors | Fase 2 fija la versión soportada (`>=2.3 <3`) y verifica contra el código fuente; tests golden por versión; `fresh_project` reporta la versión detectada y el plugin declara el rango soportado |
| `deno` ausente en la máquina del agente (CI, sandbox) | launcher sale con mensaje claro; hooks silenciosos; README lo dice primero |
| Primera ejecución necesita red (`deno cache` de `npm:typescript`, el SDK y `@deno/loader`) | `bin/fresh-dev-run` lo hace una vez y explica; alternativa: `deno.json` `"vendor": true` + commitear `vendor/` (decidir en fase 2 según tamaño) |
| `deno info --json` está marcado UNSTABLE y `@deno/loader` descarga de jsr/npm bajo demanda | resolver local propio para todo lo relativo/import-map (no depende de ninguno de los dos); `@deno/loader` con `cachedOnly: true` y `deno info` solo como enriquecimiento opcional; el análisis de rutas/islands/fronteras nunca requiere red |
| La versión de Claude Code del usuario es anterior a la referencia consultada (hook `mcp_tool`, `CwdChanged`, `FileChanged`, `additionalContext` objeto, `if` con `**/`) | cada hook tiene un handler `command` que basta por sí solo; en fase 1/6 se prueba con la versión instalada (`claude --version`, aquí 2.1.278) y el README declara la versión mínima |
| Prefijo de tools MCP (`mcp__plugin_fresh-dev_fresh__*`) distinto según instalación | no restringir `allowed-tools` a un prefijo fijo; documentar ambos (patrón LiveSpec) |
| Respuestas grandes en proyectos con cientos de rutas | `summary_only`, `limit/offset`, `prefix`; objetivo < 16 KB (Vise avisa a 32 KB) |
| Dos plugins reclaman `.ts` (typescript-lsp + fresh-dev) | documentar; `vise doctor` lo detecta; no hay arbitraje posible |
| Las docs existentes (`TAILWIND_SETUP`, `COMMON_ISSUES`, `JSX_PITFALLS`) son 1.x + Tailwind 3 | revisarlas en fase 3 antes de citarlas; separar secciones por versión |
| Vise clasifica `x.*` como `sideeffect` | follow-up en vise (§10.5); mientras tanto los recipes funcionan en L2/L3 |

---

## 16. Apéndices

### A. `plugin.json`

```json
{
  "name": "fresh-dev",
  "version": "0.1.0",
  "description": "Deno Fresh specialist for Claude Code: read-only semantic analysis MCP (routes, islands, components, middleware, server/client boundaries, impact), Fresh reasoning skills, validators, hooks and deno lsp wiring. Designed to sit under vise (orchestration) and beside livespec (symbol graph).",
  "author": { "name": "Juan Pablo Diaz" },
  "homepage": "https://github.com/Rixmerz/fresh-mcp",
  "repository": "https://github.com/Rixmerz/fresh-mcp",
  "license": "MIT",
  "keywords": ["deno", "fresh", "preact", "islands", "mcp", "static-analysis"]
}
```

### B. `hooks/hooks.json` (borrador)

```json
{
  "hooks": {
    "SessionStart": [
      { "matcher": "startup|resume|compact",
        "hooks": [ { "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/bin/fresh-dev-run\" hook detect", "timeout": 3 } ] }
    ],
    "PostToolUse": [
      { "matcher": "Edit|Write|MultiEdit",
        "if": "Edit(**/routes/**) | Write(**/routes/**) | Edit(**/islands/**) | Write(**/islands/**) | Edit(**/components/**) | Write(**/components/**) | Edit(**/deno.json) | Edit(**/fresh.gen.ts) | Edit(**/vite.config.ts) | Edit(**/main.ts)",
        "hooks": [
          { "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/bin/fresh-dev-run\" hook invalidate", "timeout": 3, "async": true },
          { "type": "mcp_tool", "server": "plugin:fresh-dev:fresh", "tool": "fresh_reindex", "input": { "workspace": "${cwd}" }, "timeout": 10 },
          { "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/bin/fresh-dev-run\" hook validate", "timeout": 5 }
        ] },
      { "matcher": "Bash",
        "hooks": [ { "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/bin/fresh-dev-run\" hook invalidate --from-bash", "timeout": 3, "async": true } ] }
    ],
    "CwdChanged": [
      { "hooks": [ { "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/bin/fresh-dev-run\" hook detect", "timeout": 3 } ] }
    ],
    "FileChanged": [
      { "matcher": "deno.json|fresh.gen.ts|vite.config.ts",
        "hooks": [ { "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/bin/fresh-dev-run\" hook invalidate", "timeout": 3, "async": true } ] }
    ]
  }
}
```

(Salida de `detect`: `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":{"type":"text","text":"…"}}}`. Si el hook `mcp_tool` falla porque el servidor no está conectado, el marcador `dirty.json` del handler `command` cubre la invalidación.)

### C. Ejemplo de `graph.json` exportado (fragmento)

```json
{
  "directed": true, "multigraph": false, "graph": { "generator": "fresh-dev", "fresh": "2.3.x" },
  "nodes": [
    { "id": "routes/blog/[slug].tsx::Post", "label": "Post", "source_file": "routes/blog/[slug].tsx",
      "source_location": "L12", "_callable": true, "_origin": "ast", "fresh_kind": "route", "fresh_pattern": "/blog/:slug" },
    { "id": "routes/blog/[slug].tsx::handler", "label": "handler", "source_file": "routes/blog/[slug].tsx",
      "source_location": "L5", "_callable": true, "_origin": "ast" },
    { "id": "components/PostBody.tsx::PostBody", "label": "PostBody", "source_file": "components/PostBody.tsx",
      "source_location": "L3", "_callable": true, "_origin": "ast" },
    { "id": "islands/LikeButton.tsx::LikeButton", "label": "LikeButton", "source_file": "islands/LikeButton.tsx",
      "source_location": "L4", "_callable": true, "_origin": "ast", "fresh_kind": "island" }
  ],
  "links": [
    { "source": "routes/blog/[slug].tsx::Post", "target": "components/PostBody.tsx::PostBody",
      "relation": "uses_component", "confidence": "EXTRACTED", "confidence_score": 0.9, "_origin": "ast" },
    { "source": "routes/blog/[slug].tsx::handler", "target": "routes/blog/[slug].tsx::Post",
      "relation": "uses", "confidence": "EXTRACTED", "confidence_score": 0.9, "_origin": "ast" },
    { "source": "routes/blog/[slug].tsx::Post", "target": "islands/LikeButton.tsx::LikeButton",
      "relation": "uses_component", "confidence": "INFERRED", "confidence_score": 0.6, "_origin": "ast" }
  ]
}
```

Los campos `fresh_*` son ignorados por LiveSpec (lector tolerante) y sirven a otros consumidores. Reglas de `label` para que el match por `(source_file, label)` funcione cuando el de línea no baste: `export default function Post()` → `Post`; `export default function() {}` / `export default () => {}` → LiveSpec acuña el basename del módulo (`[slug]`), así que fresh-mcp emite ese mismo nombre; `export const handler = { GET(ctx) {…} }` → símbolo `GET` (la propiedad `handler` no es símbolo en LiveSpec); `export default define.page(function Post() {…})` (patrón 2.x) → el export es una llamada, no una función: LiveSpec puede extraer la función nombrada interior `Post` o nada si es una arrow anónima. Por eso el skill `fresh-components` recomienda **nombrar la función dentro de `define.page(...)`**, y la fase 8 mide en el fixture 2.x qué porcentaje de nodos mapea (`mapped_nodes`) antes de dar por buena la exportación.

### D. Recipe de ejemplo (`recipes/fresh-route.yaml`)

```yaml
name: fresh-route
description: >
  Add a route to a Deno Fresh project without colliding with an existing one.
  Read-only consultation plan: it maps the route neighbourhood, proves the target
  URL is not already served, and validates after the edit. The edit itself is
  done by the calling agent between steps `trace` and `after` (vise returns a
  plan, it does not dispatch). Requires the fresh-dev plugin bound via
  .vise/capabilities.yaml (x.fresh.* → fresh.fresh_*).
tier: L2
inputs:
  - workspace      # absolute project root
  - url            # e.g. /pricing
  - prefix         # e.g. /  (route neighbourhood to list)
steps:
  - id: neighbourhood
    capability: x.fresh.routes
    description: List the routes around the prefix (layouts and middleware that will apply)
    args: { workspace: "{{ inputs.workspace }}", prefix: "{{ inputs.prefix }}", summary_only: true }
  - id: trace
    capability: x.fresh.trace
    description: Prove which route (if any) serves the target URL today
    args: { workspace: "{{ inputs.workspace }}", path: "{{ inputs.url }}" }
  - id: after
    capability: x.fresh.validate
    description: Structural validation once the route file exists
    args: { workspace: "{{ inputs.workspace }}", categories: ["routes", "boundaries"] }
  - id: assert
    capability: meta.assert
    description: The validator must report ok
    args: { condition: match, pattern: "^true$", against: "{{ steps.after.output.ok }}" }
```

`meta.assert` (verificado en `vise/src/vise/recipes/builtin.py`) solo acepta `condition: match|no_match`, `pattern` (regex) y `against` (string o lista); Vise lo ejecuta localmente salvo en `dry_run`.

### E. Skill de usuario de ejemplo (`skills/impact/SKILL.md`)

```markdown
---
name: impact
description: Fresh-aware impact of a change — routes, islands, layouts and middleware affected, plus the checks to run. Args: files or a git ref.
disable-model-invocation: true
argument-hint: "<file ...> | <git-base-ref>"
---

Workspace: the absolute path of the current project (run `pwd` if unsure). Every fresh tool needs `workspace`.

1. If `$ARGUMENTS` looks like a git ref (no `/`, no extension) call `fresh_impact` with `git: {base: "$ARGUMENTS"}`; otherwise pass the files as `files`.
2. Report, in this order and nothing else: affected routes (pattern ← why), islands whose client bundle changes, middleware/layouts touched and the routes under their scope, boundary risks, then the `suggestedChecks` verbatim as commands.
3. If livespec tools are present, add one line: run `git_diff_impact(base_ref=…)` for the symbol-level side (tests likely to break).
4. Do not edit anything.
```

### F. Fuentes

- Fresh: https://usefresh.dev/docs (2.3.31 / 1.7.3), https://github.com/denoland/fresh/releases, código fuente `denoland/fresh` (`src/`, `init/`).
- Claude Code: https://code.claude.com/docs/en/plugins.md, plugins-reference.md, skills.md, hooks-guide.md, plugin-marketplaces.md, plugin-evals.md.
- Vise: `Rixmerz/vise` (`README.md`, `CLAUDE.md`, `skills/orchestration/SKILL.md`, `skills/codelayer/SKILL.md`, `agents/frontend.md`, `src/vise/recipes/{capabilities,resolver,loader}.py`, `src/vise/engines/validators.py`, `src/vise/core/{neighbour_state,plugin_conflicts}.py`, `src/vise/cli/main.py`, `.vise/quality.yaml`, `src/vise/assets/{recipes,workflows,quality.example.yaml}`).
- LiveSpec: `Rixmerz/livespec` (`README.md`, `CLAUDE.md`, `plugin/`, `src/livespec_mcp/domain/{external_graph,external_ingest}.py`, `src/livespec_mcp/tools/{indexing,analysis}.py`, `src/livespec_mcp/config.py`).
- Marketplace: `Rixmerz/claude-plugins/.claude-plugin/marketplace.json`.
