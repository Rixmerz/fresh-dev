/** Validator runner and catalogue (plan §5). */
import type { Category, Finding, ValidationResult } from "../core/types.ts";
import type { ProjectIndex } from "../core/index.ts";
import type { Rule } from "./rule.ts";
import { routeRules } from "./routes.ts";
import { islandRules } from "./islands.ts";
import { boundaryRules } from "./boundaries.ts";
import { dependencyRules } from "./dependencies.ts";
import { conventionRules } from "./conventions.ts";
import { runDenoCheck, runDenoLint } from "./external.ts";

export const RULES: Rule[] = [
  ...routeRules,
  ...islandRules,
  ...boundaryRules,
  ...dependencyRules,
  ...conventionRules,
];
export const CATEGORIES: Category[] = [
  "routes",
  "islands",
  "boundaries",
  "dependencies",
  "conventions",
];

export interface ValidateOptions {
  categories?: Category[];
  files?: string[];
  external?: { denoLint?: boolean; denoCheck?: boolean };
  /** Skip rules that need extra filesystem walks (hook fast path). */
  fast?: boolean;
}

const SLOW_RULES = new Set(["R018", "C003", "C004", "D006"]);

export async function validate(
  index: ProjectIndex,
  opts: ValidateOptions = {},
): Promise<ValidationResult> {
  const categories = opts.categories?.length ? opts.categories : CATEGORIES;
  const files = opts.files?.length ? new Set(opts.files.map((f) => f.replace(/^\.\//, ""))) : null;
  const findings: Finding[] = [];
  const unverified: string[] = index.skipped.map((s) => `${s.file}: ${s.reason}`);
  const ctx = { index, files };
  for (const rule of RULES) {
    if (!categories.includes(rule.category)) continue;
    if (!rule.versions.includes(index.version)) continue;
    if (opts.fast && SLOW_RULES.has(rule.id)) continue;
    try {
      findings.push(...(await rule.run(ctx)));
    } catch (e) {
      unverified.push(`${rule.id}: ${(e as Error).message}`);
    }
  }
  const external = { denoLint: !!opts.external?.denoLint, denoCheck: !!opts.external?.denoCheck };
  if (external.denoLint) {
    const r = await runDenoLint(index, opts.files ?? null);
    findings.push(...r.findings);
    if (r.unverified) unverified.push(r.unverified);
  }
  if (external.denoCheck) {
    const r = await runDenoCheck(index, opts.files ?? null);
    findings.push(...r.findings);
    if (r.unverified) unverified.push(r.unverified);
  }
  findings.sort((a, b) =>
    sev(a.severity) - sev(b.severity) || a.file.localeCompare(b.file) ||
    (a.line ?? 0) - (b.line ?? 0)
  );
  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const info = findings.filter((f) => f.severity === "info").length;
  return {
    ok: errors === 0,
    findings,
    summary: { errors, warnings, info, unverified, categories, external },
  };
}

function sev(s: Finding["severity"]): number {
  return s === "error" ? 0 : s === "warning" ? 1 : 2;
}

export function catalogue(): {
  id: string;
  category: Category;
  severity: string;
  versions: string[];
  title: string;
}[] {
  return RULES.map((r) => ({
    id: r.id,
    category: r.category,
    severity: r.severity,
    versions: r.versions,
    title: r.title,
  }));
}
