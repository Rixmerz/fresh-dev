/** Rule contract shared by every validator file. */
import type { ProjectIndex } from "../core/index.ts";
import type { Category, Confidence, Finding, FreshVersion, Severity } from "../core/types.ts";

export interface RuleContext {
  index: ProjectIndex;
  /** When set, only findings on these files are reported (hook fast path). */
  files: Set<string> | null;
}

export interface Rule {
  id: string;
  category: Category;
  severity: Severity;
  versions: FreshVersion[];
  title: string;
  run(ctx: RuleContext): Promise<Finding[]> | Finding[];
}

export function finding(
  rule: Rule,
  file: string,
  message: string,
  opts: {
    line?: number | null;
    hint?: string | null;
    confidence?: Confidence;
    severity?: Severity;
  } = {},
): Finding {
  return {
    id: rule.id,
    severity: opts.severity ?? rule.severity,
    category: rule.category,
    file,
    line: opts.line ?? null,
    message,
    hint: opts.hint ?? null,
    confidence: opts.confidence ?? "extracted",
    source: "fresh-dev",
  };
}

export function inScope(ctx: RuleContext, file: string): boolean {
  return ctx.files === null || ctx.files.has(file);
}
