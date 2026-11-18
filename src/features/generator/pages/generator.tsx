import { ScrollToTop } from "@/components/common/scroll-to-top";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { IconGithub } from "@/components/ui/icons/icon-github";
import { Logo } from "@/components/ui/logo";
import { getText } from "@/i18n/get-text";
import { brand } from "@/utils/brand";
import { routes } from "@/utils/routes";

import { About } from "../components/about";
import { FooterStacks } from "../components/footer-stacks";
import { GeneratorLoader } from "../components/generator-loader";
import { StructuredData } from "../components/structured-data";
import { TourButton } from "../components/tour-button";
import { getPlugin } from "../plugins";
import { getPreset } from "../presets";

import type { PresetId } from "../presets";

type GeneratorPageProps = {
  /** Set on a preset page (/nextjs, …): its own heading, and the editor starts from it. */
  presetId?: PresetId
};

export async function GeneratorPage({ presetId }: GeneratorPageProps = {}) {
  const t = await getText("generator");
  const preset = presetId ? getPreset(presetId) : undefined;
  const presetPluginNames = preset
    ? Object.keys(preset.plugins).flatMap((pluginId) => getPlugin(pluginId)?.name ?? [])
    : [];

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border/80 bg-card">
        <div className="mx-auto flex h-14 w-full max-w-400 items-center justify-between gap-4 px-4 sm:px-6">
          <Logo href={routes.home} size="xs" />
          <div className="flex items-center gap-1">
            <TourButton />
            <ThemeToggle />
            <Button
              color="secondary"
              href={brand.repositoryUrl}
              rel="noreferrer"
              size="sm"
              startContent={<IconGithub aria-hidden="true" />}
              target="_blank"
              variant="ghost"
            >
              <span className="max-sm:sr-only">{t("header.github")}</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-400 flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight">
            {presetId ? t(`presets.pages.${presetId}.heading`) : t("hero.title")}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {presetId ? t(`presets.pages.${presetId}.description`) : t("hero.description")}
          </p>
          {presetPluginNames.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
              <span className="mr-1 text-muted-foreground">{t("presets.includes")}</span>
              {presetPluginNames.map((name) => (
                <span key={name} className="rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium">{name}</span>
              ))}
            </p>
          )}
        </div>
        <GeneratorLoader presetId={presetId} />
        <About />
      </main>
      {!presetId && <StructuredData />}
      <Footer>
        <FooterStacks currentPresetId={presetId} />
      </Footer>
      <ScrollToTop />
    </div>
  );
}
