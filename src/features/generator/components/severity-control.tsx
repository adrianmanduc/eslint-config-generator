"use client";

import { useText } from "@/hooks/use-text";
import { cn } from "@/utils/styles";

import { SEVERITIES } from "../types";

import type { Severity } from "../types";

const ACTIVE_CLASSES: Record<Severity, string> = {
  off: "bg-background text-foreground shadow-sm",
  warn: "bg-warning text-warning-foreground shadow-sm",
  error: "bg-destructive text-destructive-foreground shadow-sm",
};

type SeverityControlProps = {
  ruleId: string,
  value: Severity,
  onChange: (severity: Severity) => void
};

/** A compact off / warn / error switch. Plain buttons keep hundreds of rows cheap to render. */
export function SeverityControl({ onChange, ruleId, value }: SeverityControlProps) {
  const t = useText("generator.rules.severity");

  return (
    <div
      aria-label={t("label", { rule: ruleId })}
      className="inline-flex shrink-0 items-center rounded-md border border-border bg-muted p-0.5"
      role="group"
    >
      {SEVERITIES.map((severity) => (
        <button
          key={severity}
          aria-pressed={value === severity}
          className={cn(
            `
              h-7 cursor-pointer rounded-sm px-2.5 text-xs font-medium transition-colors outline-none
              focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background
            `,
            value === severity ? ACTIVE_CLASSES[severity] : "text-muted-foreground hover:text-foreground",
          )}
          type="button"
          onClick={() => onChange(severity)}
        >
          {t(severity)}
        </button>
      ))}
    </div>
  );
}
