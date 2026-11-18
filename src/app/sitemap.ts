import { appConfig } from "@/config";
import { presets } from "@/features/generator/presets";

import type { MetadataRoute } from "next";

// Only indexable, canonical public pages belong here.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      changeFrequency: "monthly",
      priority: 1,
      url: `${appConfig.site.url}/`,
    },
    ...presets.map((preset) => ({
      changeFrequency: "monthly" as const,
      priority: 0.8,
      url: `${appConfig.site.url}/${preset.slug}`,
    })),
  ];
}
