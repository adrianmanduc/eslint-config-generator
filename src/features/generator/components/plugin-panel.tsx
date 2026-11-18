"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLinkIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useText } from "@/hooks/use-text";

import { generatorQueries } from "../api/queries";
import { manifest } from "../catalog";
import { rangeSupportsMajor } from "../semver";

import { RuleList } from "./rule-list";

import type { PluginId } from "../plugins";
import type { BaseRule } from "../rules";
import type {
  GeneratorState, PluginDefinition, PluginOptionDefinition, PluginOptionValue, PluginState,
} from "../types";
import type { GeneratorDispatch } from "../use-generator-state";

/** Longer choice lists do not fit a segmented control next to their label. */
const MAX_SEGMENTED_CHOICES = 3;

type PluginPanelProps = {
  plugin: PluginDefinition & { id: PluginId },
  pluginState: PluginState,
  state: GeneratorState,
  baseRules: Map<string, BaseRule>,
  dispatch: GeneratorDispatch
};

type OptionFieldProps = {
  field: PluginOptionDefinition,
  value: PluginOptionValue,
  onChange: (value: PluginOptionValue) => void
};

function OptionField({ field, onChange, value }: OptionFieldProps) {
  const label = <span className="font-mono text-sm text-foreground">{field.key}</span>;

  if (field.type === "boolean") {
    return (
      <div className="flex items-center justify-between gap-3">
        {label}
        <Switch aria-label={field.key} checked={value === true} size="sm" onCheckedChange={onChange} />
      </div>
    );
  }

  if (field.type === "select") {
    const handleSelect = (selected: string | null | undefined) => {
      const choice = field.choices.find((item) => String(item) === selected);

      if (choice !== undefined) {
        onChange(choice);
      }
    };

    return (
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        {label}
        {field.choices.length > MAX_SEGMENTED_CHOICES ? (
          <Select value={String(value)} onValueChange={handleSelect}>
            <SelectTrigger aria-label={field.key} className="w-56 font-mono text-xs" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.choices.map((choice) => (
                <SelectItem key={choice} className="font-mono text-xs" value={String(choice)}>
                  {choice}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <SegmentedControl aria-label={field.key} value={[String(value)]} onValueChange={(selected) => handleSelect(selected[0])}>
            {field.choices.map((choice) => (
              <SegmentedControlItem key={choice} className="min-h-7 px-2.5 py-1 font-mono text-xs" value={String(choice)}>
                {choice}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label}
      <Input
        aria-label={field.key}
        className="font-mono"
        placeholder={field.placeholder}
        spellCheck={false}
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function PluginPanel({
  baseRules, dispatch, plugin, pluginState, state,
}: PluginPanelProps) {
  const t = useText("generator");
  const catalogQuery = useQuery(generatorQueries.catalog(plugin.id, state.eslintMajor));
  const catalog = catalogQuery.data;
  const { eslintPeerRange, ruleCount, version } = manifest[plugin.id];
  const isCompatible = rangeSupportsMajor(eslintPeerRange, state.eslintMajor);
  const optionsTarget = plugin.options?.target;
  // Factory options only apply while the config they customize is selected.
  const showOptions = optionsTarget?.kind === "settings" || (optionsTarget?.kind === "factory" && pluginState.configs.includes(optionsTarget.configId));

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">{plugin.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t(`plugins.descriptions.${plugin.id}`)}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono wrap-anywhere text-foreground">{plugin.packageName}</code>
            <span>{t("plugin.ruleCount", { count: ruleCount })}</span>
            {catalog && <span>{t("plugin.version", { version: catalog.version })}</span>}
          </p>
          {plugin.files && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("plugin.scoped")}
              {" "}
              <code className="font-mono wrap-anywhere text-foreground">{plugin.files.join(", ")}</code>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            color="secondary"
            endContent={<ExternalLinkIcon aria-hidden="true" />}
            href={plugin.docsUrl}
            rel="noreferrer"
            size="sm"
            target="_blank"
            variant="outline"
          >
            {t("plugin.docs")}
          </Button>
          {!plugin.required && (
            <Button
              color="destructive"
              size="sm"
              startContent={<Trash2Icon aria-hidden="true" />}
              variant="outline"
              onClick={() => dispatch({ type: "removePlugin", pluginId: plugin.id })}
            >
              {t("plugin.remove")}
            </Button>
          )}
        </div>
      </header>

      {!isCompatible && (
        <Alert variant="warning">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertTitle>{t("plugin.compatibility.title", { major: String(state.eslintMajor) })}</AlertTitle>
          <AlertDescription>
            {t("plugin.compatibility.description", {
              name: plugin.packageName,
              version,
              range: eslintPeerRange ?? "",
              major: String(state.eslintMajor),
            })}
          </AlertDescription>
        </Alert>
      )}

      <section aria-labelledby={`${plugin.id}-configs-title`} className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-base font-semibold" id={`${plugin.id}-configs-title`}>{t("plugin.configs.title")}</h3>
        {plugin.configs.length > 0 ? (
          <>
            <p className="mt-1 text-sm text-muted-foreground">{t("plugin.configs.description")}</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {plugin.configs.map((config) => {
                const count = catalog ? Object.keys(catalog.configs[config.id] ?? {}).length : null;

                return (
                  <li key={config.id}>
                    <Checkbox
                      checked={pluginState.configs.includes(config.id)}
                      classNames={{ wrapper: "items-start", checkbox: "mt-0.5" }}
                      description={(
                        <span className="flex flex-wrap items-center gap-2">
                          {count !== null && <span>{t("plugin.configs.ruleCount", { count })}</span>}
                          {config.typeChecked && <span className="font-medium text-brand">{t("plugin.configs.typeChecked")}</span>}
                        </span>
                      )}
                      label={<span className="font-mono">{config.id}</span>}
                      onCheckedChange={() => dispatch({ type: "toggleConfig", pluginId: plugin.id, configId: config.id })}
                    />
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">{t("plugin.configs.none")}</p>
        )}
      </section>

      {plugin.options && showOptions && (
        <section aria-labelledby={`${plugin.id}-options-title`} className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-base font-semibold" id={`${plugin.id}-options-title`}>{t("plugin.options.title")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {plugin.options.target.kind === "factory"
              ? t("plugin.options.factory", { config: plugin.options.target.configId })
              : t("plugin.options.settings")}
          </p>
          <div className="mt-4 grid gap-x-8 gap-y-3 md:grid-cols-2">
            {plugin.options.fields.map((field) => (
              <OptionField
                key={field.key}
                field={field}
                value={pluginState.options[field.key] ?? field.default}
                onChange={(value) => dispatch({
                  type: "setOption", pluginId: plugin.id, key: field.key, value,
                })}
              />
            ))}
          </div>
        </section>
      )}

      {catalog && (
        <RuleList
          key={plugin.id}
          baseRules={baseRules}
          catalog={catalog}
          dispatch={dispatch}
          plugin={plugin}
          rules={state.rules}
        />
      )}
      {catalogQuery.isPending && (
        <div aria-busy="true" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}
      {catalogQuery.isError && (
        <Alert variant="destructive">
          <TriangleAlertIcon aria-hidden="true" />
          <AlertTitle>{t("rules.error")}</AlertTitle>
          <AlertDescription>
            <Button color="secondary" size="sm" variant="outline" onClick={() => void catalogQuery.refetch()}>
              {t("rules.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
