import { Logo } from "@/components/ui/logo";
import { getText } from "@/i18n/get-text";
import { brand } from "@/utils/brand";
import { routes } from "@/utils/routes";

import type { ReactNode } from "react";

export async function Footer({ children }: { children?: ReactNode }) {
  const t = await getText("common.footer");

  return (
    <footer className="mt-16 border-t border-border/80 bg-card">
      <div className="mx-auto w-full max-w-6xl px-5 pt-14 pb-8 sm:px-6 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr] lg:gap-10">
          <div>
            <Logo href={routes.home} size="sm" />
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
              {t("description")}
            </p>
          </div>
          {children}
        </div>

        <div
          className="
            mt-12 flex flex-col gap-3 border-t border-border/70 pt-6 text-xs leading-5 text-muted-foreground
            md:flex-row md:items-end md:justify-between md:gap-6
          "
        >
          <p>{t("copyright", { year: String(new Date().getFullYear()) })}</p>
          <p className="shrink-0">
            {t.rich("madeBy", {
              name: brand.author.name,
              link: (chunks) => (
                <a
                  className="
                    rounded-sm font-medium text-foreground/80 underline-offset-4 transition-colors outline-none
                    hover:text-foreground hover:underline
                    focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
                  "
                  href={brand.author.url}
                  rel="noopener"
                  target="_blank"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>
      </div>
    </footer>
  );
}
