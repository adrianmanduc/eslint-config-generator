"use client";

import { ChevronDownIcon, FileUpIcon, RotateCcwIcon } from "lucide-react";
import { useState } from "react";

import { ConfirmationDialog } from "@/components/common/confirmation-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { useText } from "@/hooks/use-text";
import { cn } from "@/utils/styles";

import { presets } from "../presets";
import { createEmptyState, createStateFromPreset } from "../state";
import { ESLINT_MAJORS, GLOBAL_ENVIRONMENTS } from "../types";

import { ImportDialog } from "./import-dialog";

import type { PresetId } from "../presets";
import type { GeneratorState } from "../types";
import type { GeneratorDispatch } from "../use-generator-state";

type ToolbarProps = {
  state: GeneratorState,
  dispatch: GeneratorDispatch
};

/** A change that discards the current configuration and so needs confirming. */
type PendingChange = { kind: "preset", presetId: PresetId } | { kind: "reset" };

const labelClassName = "text-xs font-medium text-muted-foreground";

/** The preset the state still matches exactly, if any. */
function findActivePreset(state: GeneratorState, serialized: string): PresetId | undefined {
  return presets.find((preset) => JSON.stringify(createStateFromPreset(preset.id, state)) === serialized)?.id;
}

export function Toolbar({ dispatch, state }: ToolbarProps) {
  const t = useText("generator");
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [isIgnoresOpen, setIsIgnoresOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const serialized = JSON.stringify(state);
  const activePreset = findActivePreset(state, serialized);
  const isEmpty = JSON.stringify(createEmptyState(state)) === serialized;
  // Nothing is lost when the state is still an untouched preset or already blank.
  const hasWork = !activePreset && !isEmpty;
  const ignoreCount = state.ignores.filter((pattern) => pattern.trim() !== "").length;

  const apply = (change: PendingChange) => {
    dispatch(change.kind === "reset" ? { type: "reset" } : { type: "applyPreset", presetId: change.presetId });
  };

  const request = (change: PendingChange) => {
    if (hasWork) {
      setPendingChange(change);
    } else {
      apply(change);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4" data-tour="setup">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1.5">
          <h2 className={labelClassName} id="eslint-version-label">{t("toolbar.eslintVersion")}</h2>
          <SegmentedControl
            aria-labelledby="eslint-version-label"
            value={[String(state.eslintMajor)]}
            onValueChange={(value) => {
              const eslintMajor = ESLINT_MAJORS.find((major) => String(major) === value[0]);

              if (eslintMajor) {
                dispatch({ type: "setEslintMajor", eslintMajor });
              }
            }}
          >
            {ESLINT_MAJORS.map((major) => (
              <SegmentedControlItem key={major} className="flex-none" value={String(major)}>
                {t("toolbar.eslintMajor", { major: String(major) })}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>

        <div className="flex min-w-0 flex-1 basis-80 flex-col gap-1.5">
          <h2 className={labelClassName} id="presets-label">{t("toolbar.presets")}</h2>
          <ul aria-labelledby="presets-label" className="flex flex-wrap gap-1.5">
            {presets.map((preset) => (
              <li key={preset.id}>
                <button
                  aria-pressed={preset.id === activePreset}
                  className={cn(
                    `
                      h-9 cursor-pointer rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors outline-none
                      hover:border-brand
                      focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
                    `,
                    preset.id === activePreset && "border-brand bg-brand-subtle",
                  )}
                  title={t(`presets.items.${preset.id}.description`)}
                  type="button"
                  onClick={() => {
                    if (preset.id !== activePreset) {
                      request({ kind: "preset", presetId: preset.id });
                    }
                  }}
                >
                  {t(`presets.items.${preset.id}.name`)}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            color="secondary"
            startContent={<FileUpIcon aria-hidden="true" />}
            title={t("import.openHint")}
            variant="outline"
            onClick={() => setIsImportOpen(true)}
          >
            {t("import.open")}
          </Button>
          <Button
            color="secondary"
            disabled={isEmpty}
            startContent={<RotateCcwIcon aria-hidden="true" />}
            title={t("toolbar.startOverHint")}
            variant="outline"
            onClick={() => request({ kind: "reset" })}
          >
            {t("toolbar.startOver")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-3">
        <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <legend className={cn(labelClassName, "float-left mr-4")} title={t("project.globals.description")}>
            {t("project.globals.title")}
          </legend>
          {GLOBAL_ENVIRONMENTS.map((environment) => (
            <Checkbox
              key={environment}
              checked={state.globals.includes(environment)}
              label={<span title={t(`project.globals.${environment}Hint`)}>{t(`project.globals.${environment}`)}</span>}
              onCheckedChange={() => dispatch({ type: "toggleGlobal", environment })}
            />
          ))}
        </fieldset>

        <button
          aria-controls="ignored-paths"
          aria-expanded={isIgnoresOpen}
          className="
            flex cursor-pointer items-center gap-1 rounded-sm text-sm font-medium outline-none
            hover:underline
            focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
          "
          type="button"
          onClick={() => setIsIgnoresOpen(!isIgnoresOpen)}
        >
          {t("project.ignores.toggle", { count: String(ignoreCount) })}
          <ChevronDownIcon aria-hidden="true" className={cn("size-4 transition-transform", isIgnoresOpen && "rotate-180")} />
        </button>
      </div>

      {isIgnoresOpen && (
        <div className="flex max-w-xl flex-col gap-1.5" id="ignored-paths">
          <p className="text-xs text-muted-foreground">{t("project.ignores.description")}</p>
          <Textarea
            aria-label={t("project.ignores.title")}
            size="sm"
            spellCheck={false}
            textareaClassName="font-mono"
            value={state.ignores.join("\n")}
            onChange={(event) => dispatch({ type: "setIgnores", ignores: event.target.value.split("\n") })}
          />
        </div>
      )}

      <ImportDialog dispatch={dispatch} open={isImportOpen} state={state} onOpenChange={setIsImportOpen} />

      <ConfirmationDialog
        cancelLabel={t("toolbar.cancel")}
        confirmLabel={pendingChange?.kind === "reset" ? t("toolbar.resetConfirm") : t("toolbar.confirm")}
        description={
          pendingChange?.kind === "preset"
            ? t("toolbar.confirmDescription", { name: t(`presets.items.${pendingChange.presetId}.name`) })
            : t("toolbar.resetDescription")
        }
        open={pendingChange !== null}
        title={pendingChange?.kind === "reset" ? t("toolbar.resetTitle") : t("toolbar.confirmTitle")}
        onConfirm={() => {
          if (pendingChange) {
            apply(pendingChange);
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            setPendingChange(null);
          }
        }}
      />
    </div>
  );
}
