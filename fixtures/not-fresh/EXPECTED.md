# EXPECTED — `fixtures/not-fresh`

Negative control. The detector must stay silent and every `fresh_*` tool must
refuse with a structured error.

## Detection (`fresh_project` / `core/detect.ts`)

| Fact           | Expected                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------- |
| `isFresh`      | `false`                                                                                   |
| `version`      | `null`                                                                                    |
| `flavor`       | `"unknown"`                                                                               |
| `freshVersion` | `null`                                                                                    |
| `confidence`   | `"low"` (or absent)                                                                       |
| `evidence`     | no Fresh signal; may list the weak `routes/` dir hit, which must not be enough on its own |

## Signals that are present but must NOT count as Fresh

| Signal                                      | Present here                                                 | Why it is not enough                                                                           |
| ------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| top-level `routes/` directory               | yes (`routes/index.ts`)                                      | Remix/SvelteKit/plain routers also have one; directory signals are "medium" and never decisive |
| `deno.json` `imports["vite"]`               | yes                                                          | Vite is only a 2.x hint when paired with `fresh` / `@fresh/plugin-vite`                        |
| `deno.json` `imports["preact"]` (`npm:`)    | yes                                                          | Preact alone is not Fresh                                                                      |
| `vite.config.ts`                            | yes, but with `@preact/preset-vite`, no `@fresh/plugin-vite` | flavor `2.x-vite` requires `import { fresh } from "@fresh/plugin-vite"`                        |
| `compilerOptions.jsxImportSource: "preact"` | yes                                                          | same as above                                                                                  |

## Signals that are absent (decisive)

- `imports["fresh"]` containing `@fresh/core` → absent
- `imports["$fresh/"]` → absent
- `fresh.gen.ts`, `fresh.config.ts`, `dev.ts`, `main.ts`, `utils.ts`,
  `client.ts` → absent
- any `from "fresh"` / `"$fresh/..."` import in code → absent
- `islands/`, `static/`, `_fresh/` → absent

## Tool behaviour

| Call                                 | Expected                                                   |
| ------------------------------------ | ---------------------------------------------------------- |
| `fresh_project({workspace})`         | `{ ok: false, error: "<not a Fresh project>", hint: ... }` |
| every other `fresh_*` tool           | same structured refusal (`ok: false`), never a crash       |
| CLI `fresh-mcp validate <workspace>` | exit code `2` (not a Fresh project)                        |
| SessionStart / detect hook           | prints nothing, exits `0`                                  |
| `fresh_validate` findings            | none (tool refuses before running rules)                   |
