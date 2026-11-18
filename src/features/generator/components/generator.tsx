"use client";

import { useRef, useState } from "react";

import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { useText } from "@/hooks/use-text";
import { cn } from "@/utils/styles";

import { useCatalogs } from "../api/queries";
import { generateConfig } from "../generate-config";
import { pluginIds, plugins } from "../plugins";
import { resolveBaseRules } from "../rules";
import { useGeneratorState } from "../use-generator-state";

import { OutputPanel } from "./output-panel";
import { PluginPanel } from "./plugin-panel";
import { Sidebar } from "./sidebar";
import { StartingConfig } from "./starting-config";
import { Toolbar } from "./toolbar";
import { Tour } from "./tour";

import type { PluginId } from "../plugins";
import type { PresetId } from "../presets";

/** Below the lg breakpoint the editor and the output take turns instead of stacking. */
const MOBILE_VIEWS = ["configure", "output"] as const;

type MobileView = (typeof MOBILE_VIEWS)[number];

export type GeneratorProps = {
  /** Set on a preset page (/nextjs, …): the editor starts from this preset. */
  presetId?: PresetId
};

/** The interactive generator. Browser-only: its state is restored from localStorage. */
export function Generator({ presetId }: GeneratorProps) {
  const [state, dispatch] = useGeneratorState();
  const t = useText("generator.mobileView");
  const [section, setSection] = useState<PluginId>("core");
  const [mobileView, setMobileView] = useState<MobileView>("configure");
  const workspace = useRef<HTMLDivElement>(null);
  const enabledPluginIds = pluginIds.filter((pluginId) => pluginId in state.plugins);
  const catalogs = useCatalogs(enabledPluginIds, state.eslintMajor);
  const baseRules = resolveBaseRules(state, catalogs);
  const generated = generateConfig(state, catalogs);
  // A removed plugin (or a preset without it) falls back to ESLint core.
  const activeSection = section in state.plugins ? section : "core";
  const activePlugin = plugins.find((plugin) => plugin.id === activeSection);
  const activePluginState = activePlugin && state.plugins[activePlugin.id];

  const handleMobileViewChange = (value: string[]) => {
    const next = MOBILE_VIEWS.find((view) => view === value[0]);

    if (next) {
      setMobileView(next);
      // The two views differ in height, so start the new one from its top.
      workspace.current?.scrollIntoView({ block: "start" });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Toolbar dispatch={dispatch} state={state} />
      <div ref={workspace} className="flex scroll-mt-0 flex-col gap-4 lg:gap-0">
        <div
          className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:hidden"
          data-tour="output"
        >
          <SegmentedControl aria-label={t("label")} className="flex w-full" value={[mobileView]} onValueChange={handleMobileViewChange}>
            {MOBILE_VIEWS.map((view) => (
              <SegmentedControlItem key={view} value={view}>
                {t(view)}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_26rem] xl:grid-cols-[15rem_minmax(0,1fr)_30rem]">
          <div
            className={cn(
              "min-w-0 lg:col-start-1 lg:row-start-1 xl:sticky xl:top-4 xl:max-h-[calc(100svh-2rem)] xl:overflow-y-auto",
              mobileView === "output" && "max-lg:hidden",
            )}
            data-tour="plugins"
          >
            <Sidebar activeSection={activeSection} dispatch={dispatch} state={state} onSelect={setSection} />
          </div>
          <div
            className={cn("min-w-0 lg:col-start-1 lg:row-start-2 xl:col-start-2 xl:row-start-1", mobileView === "output" && "max-lg:hidden")}
            data-tour="rules"
          >
            {activePlugin && activePluginState && (
              <PluginPanel
                key={activePlugin.id}
                baseRules={baseRules}
                dispatch={dispatch}
                plugin={activePlugin}
                pluginState={activePluginState}
                state={state}
              />
            )}
          </div>
          <OutputPanel
            className={cn(
              `
                max-h-[calc(100svh-5rem)] min-w-0
                lg:sticky lg:top-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(100svh-2rem)]
                xl:col-start-3 xl:row-span-1
              `,
              mobileView === "configure" && "max-lg:hidden",
            )}
            dispatch={dispatch}
            generated={generated}
            state={state}
          />
        </div>
      </div>
      <Tour />
      <StartingConfig dispatch={dispatch} presetId={presetId} state={state} />
    </div>
  );
}
