import Link from "next/link";

import { getText } from "@/i18n/get-text";

import { presets } from "../presets";

import type { PresetId } from "../presets";
import type { Route } from "next";

/**
 * Footer column linking every preset page (/nextjs, …), so each page of the
 * site links to all of them. Rendered on the server.
 */
export async function FooterStacks({ currentPresetId }: { currentPresetId?: PresetId }) {
  const t = await getText("generator");

  return (
    <nav aria-labelledby="footer-stacks">
      <h2 className="text-sm font-semibold" id="footer-stacks">{t("about.stacksTitle")}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {presets.map((preset) => (
          <li key={preset.id}>
            <Link
              aria-current={preset.id === currentPresetId ? "page" : undefined}
              className="
                rounded-sm text-sm text-muted-foreground underline-offset-4 transition-colors outline-none
                hover:text-foreground hover:underline
                focus-visible:ring-2 focus-visible:ring-ring
                aria-[current=page]:font-medium aria-[current=page]:text-foreground
              "
              href={`/${preset.slug}` as Route}
            >
              {t(`presets.pages.${preset.id}.heading`)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
