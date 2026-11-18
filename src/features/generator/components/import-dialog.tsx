"use client";

import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useText } from "@/hooks/use-text";

import { loadCatalog } from "../catalog";
import { importEslintrc } from "../import-eslintrc";
import { getPlugin } from "../plugins";

import type { ImportReport } from "../import-eslintrc";
import type { PluginId } from "../plugins";
import type { GeneratorState, PluginCatalog } from "../types";
import type { GeneratorDispatch } from "../use-generator-state";

type ImportDialogProps = {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  state: GeneratorState,
  dispatch: GeneratorDispatch
};

/** Pastes a legacy .eslintrc and replaces the editor with what maps onto it. */
export function ImportDialog({
  dispatch, onOpenChange, open, state,
}: ImportDialogProps) {
  const t = useText("generator.import");
  const [text, setText] = useState("");
  const [error, setError] = useState<"parse" | "notConfig" | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setText("");
      setError(null);
      setReport(null);
    }

    onOpenChange(next);
  };

  const handleImport = async () => {
    const base = { eslintMajor: state.eslintMajor, packageManager: state.packageManager, configFormat: state.configFormat };
    const draft = importEslintrc(text, base);

    if (!draft.ok) {
      setError(draft.error);

      return;
    }

    setIsImporting(true);

    // Check every rule against the installed plugin versions before using it.
    const pluginIds = Object.keys(draft.state.plugins) as PluginId[];
    const catalogs: Partial<Record<PluginId, PluginCatalog>> = Object.fromEntries(
      await Promise.all(pluginIds.map(async (pluginId) => [pluginId, await loadCatalog(pluginId, state.eslintMajor)] as const)),
    );
    const result = importEslintrc(text, base, catalogs);

    setIsImporting(false);

    if (result.ok) {
      dispatch({ type: "replace", state: result.state });
      setReport(result.report);
      setError(null);
    }
  };

  const skipped = report ? [...report.skippedExtends, ...report.skippedPlugins, ...report.skippedRules] : [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-4">
          {report ? (
            <>
              <Alert variant="success">
                <CircleCheckIcon aria-hidden="true" />
                <AlertTitle>{t("doneTitle")}</AlertTitle>
                <AlertDescription>
                  {t("doneDescription", {
                    plugins: report.plugins.length,
                    rules: report.ruleCount,
                    names: report.plugins.map((pluginId) => getPlugin(pluginId)?.name ?? pluginId).join(", "),
                  })}
                </AlertDescription>
              </Alert>
              {(skipped.length > 0 || report.overrideCount > 0) && (
                <Alert variant="warning">
                  <TriangleAlertIcon aria-hidden="true" />
                  <AlertTitle>{t("skippedTitle")}</AlertTitle>
                  <AlertDescription className="flex flex-col gap-2">
                    {skipped.length > 0 && (
                      <>
                        <span>{t("skippedDescription")}</span>
                        <span className="font-mono text-xs wrap-anywhere">{skipped.join(", ")}</span>
                      </>
                    )}
                    {report.overrideCount > 0 && <span>{t("overrides", { count: report.overrideCount })}</span>}
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <>
              <Textarea
                aria-invalid={error !== null}
                aria-label={t("inputLabel")}
                className="font-mono text-xs"
                placeholder={t("placeholder")}
                rows={14}
                spellCheck={false}
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setError(null);
                }}
              />
              {error && (
                <Alert variant="destructive">
                  <TriangleAlertIcon aria-hidden="true" />
                  <AlertDescription>{t(`errors.${error}`)}</AlertDescription>
                </Alert>
              )}
              <p className="text-xs text-muted-foreground">{t("replaceNote")}</p>
            </>
          )}
        </DialogPanel>
        <DialogFooter>
          {report ? (
            <Button color="primary" onClick={() => handleOpenChange(false)}>{t("done")}</Button>
          ) : (
            <>
              <Button color="secondary" variant="outline" onClick={() => handleOpenChange(false)}>{t("cancel")}</Button>
              <Button color="primary" disabled={text.trim() === "" || isImporting} onClick={() => void handleImport()}>
                {t("submit")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
