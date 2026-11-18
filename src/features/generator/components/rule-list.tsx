"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { SegmentedControl, SegmentedControlItem } from "@/components/ui/segmented-control";
import { useText } from "@/hooks/use-text";

import { toRuleId } from "../plugins";
import { getEntrySeverity } from "../rules";

import { RuleRow } from "./rule-row";

import type { BaseRule } from "../rules";
import type {
  GeneratorState, PluginCatalog, PluginDefinition,
} from "../types";
import type { GeneratorDispatch } from "../use-generator-state";

const FILTERS = ["all", "active", "customized"] as const;

type Filter = (typeof FILTERS)[number];

type RuleListProps = {
  plugin: PluginDefinition,
  catalog: PluginCatalog,
  rules: GeneratorState["rules"],
  baseRules: Map<string, BaseRule>,
  dispatch: GeneratorDispatch
};

export function RuleList({
  baseRules, catalog, dispatch, plugin, rules,
}: RuleListProps) {
  const t = useText("generator.rules");
  const [search, setSearch] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [showDeprecated, setShowDeprecated] = useState(false);
  const query = search.trim().toLowerCase();

  const items = catalog.rules.map((rule) => {
    const ruleId = toRuleId(plugin, rule.name);

    return {
      rule, ruleId, setting: rules[ruleId], base: baseRules.get(ruleId),
    };
  });

  const customizedCount = items.filter((item) => item.setting).length;

  const visibleItems = items.filter(({ base, rule, setting }) => {
    const severity = setting?.severity ?? (base ? getEntrySeverity(base.entry) : "off");

    // A deprecated rule the user changed stays visible, so it can always be reset.
    if (rule.deprecated && !showDeprecated && !setting) {
      return false;
    }

    if (filter === "active" && severity === "off") {
      return false;
    }

    if (filter === "customized" && !setting) {
      return false;
    }

    return !query || rule.name.toLowerCase().includes(query) || rule.description.toLowerCase().includes(query);
  });

  return (
    <section aria-labelledby={`${plugin.id}-rules-title`} className="rounded-lg border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold" id={`${plugin.id}-rules-title`}>
            {t("title")}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {t("count", { shown: String(visibleItems.length), total: String(catalog.rules.length) })}
            </span>
          </h3>
          <SegmentedControl
            aria-label={t("filter")}
            className="shrink-0"
            value={[filter]}
            onValueChange={(value) => {
              const next = FILTERS.find((item) => item === value[0]);

              if (next) {
                setFilter(next);
              }
            }}
          >
            {FILTERS.map((item) => (
              <SegmentedControlItem key={item} className="flex-none px-3.5" value={item}>
                {t(`filters.${item}`)}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <InputGroup className="h-10 min-w-48 flex-1">
            <InputGroupAddon>
              <SearchIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchInput}
              aria-label={t("search")}
              placeholder={t("search")}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search !== "" && (
              <InputGroupAddon align="inline-end">
                <Button
                  iconOnly
                  aria-label={t("clearSearch")}
                  className="size-7"
                  color="secondary"
                  title={t("clearSearch")}
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
          <Checkbox checked={showDeprecated} label={t("showDeprecated")} onCheckedChange={setShowDeprecated} />
          {customizedCount > 0 && (
            <Button color="secondary" size="sm" variant="flat" onClick={() => dispatch({ type: "clearPluginRules", pluginId: plugin.id })}>
              {t("resetAll")}
            </Button>
          )}
        </div>
      </div>
      {visibleItems.length > 0 ? (
        // The list scrolls inside the card (a plugin can have hundreds of rules),
        // so the content below the generator stays reachable. Below lg the sticky
        // view switch takes less room than the panel header does from lg.
        <ul className="max-h-[calc(100svh-8rem)] min-h-80 divide-y divide-border overflow-y-auto rounded-b-lg lg:max-h-[calc(100svh-12rem)]">
          {visibleItems.map((item) => (
            <RuleRow
              key={item.ruleId}
              base={item.base}
              dispatch={dispatch}
              rule={item.rule}
              ruleId={item.ruleId}
              setting={item.setting}
            />
          ))}
        </ul>
      ) : (
        <p className="p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      )}
    </section>
  );
}
