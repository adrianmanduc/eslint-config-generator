"use client";

import { PlusIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { useText } from "@/hooks/use-text";
import { cn } from "@/utils/styles";

import { manifest } from "../catalog";
import { getRulePluginId, plugins } from "../plugins";
import { rangeSupportsMajor } from "../semver";

import { AddPluginDialog } from "./add-plugin-dialog";

import type { PluginId } from "../plugins";
import type { GeneratorState } from "../types";
import type { GeneratorDispatch } from "../use-generator-state";

type SidebarProps = {
  state: GeneratorState,
  activeSection: PluginId,
  onSelect: (pluginId: PluginId) => void,
  dispatch: GeneratorDispatch
};

/**
 * Below the xl breakpoint the sidebar sits above the editor, so its entries
 * are compact chips that wrap. From xl up it is a vertical list in its own
 * column, with a line of detail under each plugin.
 */
const itemClassName = `
  flex min-w-0 cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-left text-sm
  transition-colors outline-none
  hover:bg-accent hover:text-accent-foreground
  focus-visible:ring-2 focus-visible:ring-ring
  xl:w-full xl:py-2
`;

export function Sidebar({
  activeSection, dispatch, onSelect, state,
}: SidebarProps) {
  const t = useText("generator");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const enabledPlugins = plugins.filter((plugin) => plugin.id in state.plugins);
  const customizedCounts = new Map<PluginId, number>();

  for (const ruleId of Object.keys(state.rules)) {
    const pluginId = getRulePluginId(ruleId);

    customizedCounts.set(pluginId, (customizedCounts.get(pluginId) ?? 0) + 1);
  }

  return (
    <nav aria-label={t("sidebar.label")} className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold">{t("sidebar.plugins")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("sidebar.hint")}</p>
      </div>
      <ul className="flex flex-wrap gap-1.5 xl:flex-col xl:flex-nowrap">
        {enabledPlugins.map((plugin) => {
          const isActive = activeSection === plugin.id;
          const count = customizedCounts.get(plugin.id) ?? 0;
          const configs = state.plugins[plugin.id]?.configs ?? [];
          const isCompatible = rangeSupportsMajor(manifest[plugin.id].eslintPeerRange, state.eslintMajor);
          const isRemovable = !("required" in plugin);

          return (
            <li key={plugin.id} className="group/item relative flex max-w-full items-center">
              <button
                aria-current={isActive ? "page" : undefined}
                className={cn(itemClassName, isActive && "border-brand bg-brand-subtle text-foreground hover:bg-brand-subtle")}
                type="button"
                onClick={() => onSelect(plugin.id)}
              >
                {/* Leaves room for the remove button that overlays the right edge. */}
                <span className={cn("min-w-0 flex-1", isRemovable && "mr-6")}>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="truncate">{plugin.name}</span>
                    {!isCompatible && (
                      <TriangleAlertIcon
                        aria-label={t("sidebar.incompatible", { major: String(state.eslintMajor) })}
                        className="size-3.5 shrink-0 text-warning"
                        role="img"
                      />
                    )}
                    {count > 0 && (
                      <span aria-hidden="true" className="rounded-full bg-brand/10 px-1.5 text-xs font-medium text-brand xl:hidden">
                        {count}
                      </span>
                    )}
                  </span>
                  <span className="hidden truncate font-mono text-xs text-muted-foreground xl:block">
                    {configs.length > 0 ? configs.join(", ") : <span className="font-sans">{t("sidebar.noConfig")}</span>}
                  </span>
                  {count > 0 && (
                    <span className="sr-only text-xs text-muted-foreground xl:not-sr-only xl:block">
                      {t("sidebar.customized", { count })}
                    </span>
                  )}
                </span>
              </button>
              {isRemovable && (
                <button
                  aria-label={t("sidebar.remove", { name: plugin.name })}
                  className="
                    absolute top-1.5 right-1.5 flex size-6 cursor-pointer items-center justify-center rounded-sm text-muted-foreground
                    transition-colors outline-none
                    hover:bg-destructive/10 hover:text-destructive
                    focus-visible:ring-2 focus-visible:ring-ring
                  "
                  title={t("sidebar.remove", { name: plugin.name })}
                  type="button"
                  onClick={() => dispatch({ type: "removePlugin", pluginId: plugin.id })}
                >
                  <XIcon aria-hidden="true" className="size-3.5" />
                </button>
              )}
            </li>
          );
        })}
        <li className="max-w-full">
          <button
            className={cn(itemClassName, "justify-center border-dashed bg-transparent font-medium text-muted-foreground hover:text-foreground")}
            type="button"
            onClick={() => setIsAddOpen(true)}
          >
            <PlusIcon aria-hidden="true" className="size-4 shrink-0" />
            {t("sidebar.addPlugin")}
          </button>
        </li>
      </ul>

      <AddPluginDialog
        open={isAddOpen}
        state={state}
        onAdd={(pluginId) => {
          dispatch({ type: "addPlugin", pluginId });
          onSelect(pluginId);
        }}
        onOpenChange={setIsAddOpen}
      />
    </nav>
  );
}
