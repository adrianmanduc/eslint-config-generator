import { notFound } from "next/navigation";

import { GeneratorPage } from "@/features/generator/pages/generator";
import { getPresetBySlug, presets } from "@/features/generator/presets";
import { getText } from "@/i18n/get-text";
import { brand } from "@/utils/brand";

import type { PresetId } from "@/features/generator/presets";
import type { Metadata } from "next";

// One static page per preset (/nextjs, /nestjs, …); any other path is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return presets.map((preset) => ({ preset: preset.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[preset]">): Promise<Metadata> {
  const preset = getPresetBySlug((await params).preset);

  if (!preset) {
    return {};
  }

  const t = await getText("generator.presets.pages");
  const id = preset.id as PresetId;
  const title = `${t(`${id}.title`)} | ${brand.name}`;
  const description = t(`${id}.description`);

  return {
    alternates: { canonical: `/${preset.slug}` },
    description,
    openGraph: { description, title, url: `/${preset.slug}` },
    // An absolute title: the root template would add the brand a second time.
    title: { absolute: title },
  };
}

export default async function PresetPage({ params }: PageProps<"/[preset]">) {
  const preset = getPresetBySlug((await params).preset);

  if (!preset) {
    notFound();
  }

  return <GeneratorPage presetId={preset.id as PresetId} />;
}
