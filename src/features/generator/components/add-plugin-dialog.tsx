"use client";

import {
  CheckIcon, PlusIcon, SearchIcon, TriangleAlertIcon, XIcon,
} from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogTitle,
} from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useText } from "@/hooks/use-text";

import { manifest } from "../catalog";
import { plugins } from "../plugins";
import { rangeSupportsMajor } from "../semver";
import { PLUGIN_CATEGORIES } from "../types";

import type { PluginId } from "../plugins";
import type { GeneratorState } from "../types";

type AddPluginDialogProps = {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  state: GeneratorState,
  onAdd: (pluginId: PluginId) => void
};

/** The plugin catalog: every available plugin with what it does, grouped by category. */
export function AddPluginDialog({
  onAdd, onOpenChange, open, state,
}: AddPluginDialogProps) {
  const t = useText("generator");
  const [search, setSearch] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const query = search.trim().toLowerCase();

  const matches = plugins.filter((plugin) => {
    const text = `${plugin.name} ${plugin.packageName} ${t(`plugins.descriptions.${plugin.id}`)}`.toLowerCase();

    return !("required" in plugin) && (!query || text.includes(query));
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("addPlugin.title")}</DialogTitle>
          <DialogDescription>{t("addPlugin.description")}</DialogDescription>
          <InputGroup className="mt-2 h-10">
            <InputGroupAddon>
              <SearchIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchInput}
              aria-label={t("addPlugin.search")}
              placeholder={t("addPlugin.search")}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search !== "" && (
              <InputGroupAddon align="inline-end">
                <Button
                  iconOnly
                  aria-label={t("addPlugin.clearSearch")}
                  className="size-7"
                  color="secondary"
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    searchInput.current?.focus();
                  }}
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </InputGroupAddon>
            )}
          </InputGroup>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-5">
          {matches.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{t("addPlugin.empty")}</p>}
          {PLUGIN_CATEGORIES.map((category) => {
            const categoryPlugins = matches.filter((plugin) => plugin.category === category);

            if (categoryPlugins.length === 0) {
              return null;
            }

            return (
              <section key={category} className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  {t(`plugins.categories.${category}`)}
                </h3>
                <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                  {categoryPlugins.map((plugin) => {
                    const isAdded = plugin.id in state.plugins;
                    const { eslintPeerRange, ruleCount } = manifest[plugin.id];
                    const isCompatible = rangeSupportsMajor(eslintPeerRange, state.eslintMajor);

                    return (
                      <li key={plugin.id} className="flex items-start gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-medium text-foreground">
                            {plugin.name}
                            <code className="font-mono text-xs font-normal wrap-anywhere text-muted-foreground">{plugin.packageName}</code>
                          </p>
                          <p className="mt-0.5 text-sm text-muted-foreground">{t(`plugins.descriptions.${plugin.id}`)}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            <span>{t("addPlugin.ruleCount", { count: ruleCount })}</span>
                            {!isCompatible && (
                              <span className="flex items-center gap-1 text-foreground">
                                <TriangleAlertIcon aria-hidden="true" className="size-3.5 text-warning" />
                                {t("addPlugin.incompatible", { major: String(state.eslintMajor) })}
                              </span>
                            )}
                          </p>
                        </div>
                        {isAdded ? (
                          <span className="flex h-8 shrink-0 items-center gap-1 px-2 text-xs font-medium text-muted-foreground">
                            <CheckIcon aria-hidden="true" className="size-3.5" />
                            {t("addPlugin.added")}
                          </span>
                        ) : (
                          <Button
                            aria-label={t("addPlugin.addLabel", { name: plugin.name })}
                            className="shrink-0"
                            color="secondary"
                            size="sm"
                            startContent={<PlusIcon aria-hidden="true" />}
                            variant="outline"
                            onClick={() => onAdd(plugin.id)}
                          >
                            {t("addPlugin.add")}
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </DialogPanel>
        <DialogFooter>
          <Button color="primary" onClick={() => onOpenChange(false)}>
            {t("addPlugin.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
