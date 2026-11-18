"use client";

import { RotateCcwIcon, SlidersHorizontalIcon, WrenchIcon } from "lucide-react";
import { useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useText } from "@/hooks/use-text";

import { getEntryOptions, getEntrySeverity, parseRuleOptions } from "../rules";

import { SeverityControl } from "./severity-control";

import type { BaseRule } from "../rules";
import type { RuleMeta, RuleSetting, Severity } from "../types";
import type { GeneratorDispatch } from "../use-generator-state";

type RuleRowProps = {
  ruleId: string,
  rule: RuleMeta,
  /** The user's override, if any. */
  setting: RuleSetting | undefined,
  /** What the selected shared configs set for this rule, if anything. */
  base: BaseRule | undefined,
  dispatch: GeneratorDispatch
};

function formatOptions(options: unknown[]) {
  return options.length > 0 ? JSON.stringify(options, null, 2) : "";
}

export function RuleRow({
  base, dispatch, rule, ruleId, setting,
}: RuleRowProps) {
  const t = useText("generator.rules");
  const optionsId = useId();
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const baseSeverity = base ? getEntrySeverity(base.entry) : "off";
  const severity = setting?.severity ?? baseSeverity;
  const options = setting?.options ?? (base ? getEntryOptions(base.entry) : []);
  const [optionsText, setOptionsText] = useState(() => formatOptions(options));
  const parsedOptions = parseRuleOptions(optionsText);
  const canEditOptions = rule.hasOptions && severity !== "off";

  const update = (nextSeverity: Severity, nextOptions: unknown[] | undefined) => {
    // An override that only repeats the shared config is noise in the output.
    if (nextSeverity === baseSeverity && !nextOptions?.length) {
      dispatch({ type: "clearRule", ruleId });
    } else {
      dispatch({ type: "setRule", ruleId, setting: nextOptions?.length ? { severity: nextSeverity, options: nextOptions } : { severity: nextSeverity } });
    }
  };

  const handleOptionsChange = (text: string) => {
    const result = parseRuleOptions(text);

    setOptionsText(text);

    if (result.ok) {
      update(severity, result.options);
    }
  };

  const handleOptionsToggle = () => {
    // Re-read the options on open: a preset or a reset may have changed them since.
    if (!isOptionsOpen) {
      setOptionsText(formatOptions(options));
    }

    setIsOptionsOpen(!isOptionsOpen);
  };

  const handleReset = () => {
    dispatch({ type: "clearRule", ruleId });
    setOptionsText(formatOptions(base ? getEntryOptions(base.entry) : []));
  };

  return (
    <li className="flex flex-col gap-3 px-4 py-3 [contain-intrinsic-size:auto_4.5rem] [content-visibility:auto]">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-64">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {rule.url ? (
              <a
                className="
                  rounded-sm font-mono text-sm font-medium wrap-anywhere text-foreground underline-offset-4 outline-none
                  hover:text-brand hover:underline
                  focus-visible:ring-2 focus-visible:ring-ring
                "
                href={rule.url}
                rel="noreferrer"
                target="_blank"
              >
                {rule.name}
              </a>
            ) : (
              <span className="font-mono text-sm font-medium wrap-anywhere text-foreground">{rule.name}</span>
            )}
            {rule.fixable && (
              <Badge title={t("badges.fixableHint")} variant="secondary">
                <WrenchIcon aria-hidden="true" />
                {t("badges.fixable")}
              </Badge>
            )}
            {rule.typed && (
              <Badge title={t("badges.typedHint")} variant="brand">{t("badges.typed")}</Badge>
            )}
            {rule.deprecated && <Badge variant="warning">{t("badges.deprecated")}</Badge>}
          </div>
          {rule.description && <p className="mt-1 text-sm text-muted-foreground">{rule.description}</p>}
          {(setting || base) && (
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {setting ? (
                <span className="font-medium text-brand">{t("source.customized")}</span>
              ) : (
                <span>{t("source.config", { config: base?.configId ?? "" })}</span>
              )}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {setting && (
            <Button
              iconOnly
              aria-label={t("reset", { rule: ruleId })}
              color="secondary"
              size="sm"
              title={t("reset", { rule: ruleId })}
              variant="ghost"
              onClick={handleReset}
            >
              <RotateCcwIcon aria-hidden="true" />
            </Button>
          )}
          {canEditOptions && (
            <Button
              aria-controls={optionsId}
              aria-expanded={isOptionsOpen}
              color="secondary"
              size="sm"
              startContent={<SlidersHorizontalIcon aria-hidden="true" />}
              variant={isOptionsOpen ? "flat" : "ghost"}
              onClick={handleOptionsToggle}
            >
              {t("options.toggle")}
            </Button>
          )}
          <SeverityControl ruleId={ruleId} value={severity} onChange={(nextSeverity) => update(nextSeverity, setting?.options)} />
        </div>
      </div>
      {canEditOptions && isOptionsOpen && (
        <div className="flex flex-col gap-1.5" id={optionsId}>
          <Textarea
            aria-invalid={!parsedOptions.ok}
            aria-label={t("options.label", { rule: ruleId })}
            placeholder="[]"
            spellCheck={false}
            textareaClassName="min-h-16 font-mono text-xs"
            value={optionsText}
            onChange={(event) => handleOptionsChange(event.target.value)}
          />
          {parsedOptions.ok ? (
            <p className="text-xs text-muted-foreground">
              {t("options.hint")}
              {" "}
              {t("options.docs")}
            </p>
          ) : (
            <p className="text-xs text-destructive" role="alert">{t("options.invalid")}</p>
          )}
        </div>
      )}
    </li>
  );
}
