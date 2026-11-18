import { PlusIcon } from "lucide-react";

import { getText } from "@/i18n/get-text";
import { brand } from "@/utils/brand";

import { plugins } from "../plugins";
import { PLUGIN_CATEGORIES } from "../types";

import type { ReactNode } from "react";

const STEP_IDS = ["stack", "tune", "ship"] as const;
export const FAQ_IDS = ["flatConfig", "migrate", "version", "typescript", "next", "privacy", "free"] as const;

const code = (chunks: ReactNode) => (
  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">{chunks}</code>
);

/**
 * What the generator does, the plugins it supports and common questions.
 * Rendered on the server: the generator itself is browser-only, so this is the
 * text search engines and link previews see.
 */
export async function About() {
  const t = await getText("generator");

  return (
    <div className="mt-10 flex flex-col gap-14 border-t border-border/80 pt-12">
      <section aria-labelledby="about-how">
        <h2 className="text-2xl font-semibold tracking-tight" id="about-how">{t("about.howTitle")}</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEP_IDS.map((stepId, index) => (
            <li key={stepId} className="rounded-lg border border-border bg-card p-5">
              <span aria-hidden="true" className="font-mono text-sm text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 text-base font-semibold">{t(`about.steps.${stepId}.title`)}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{t.rich(`about.steps.${stepId}.body`, { code })}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="about-plugins">
        <h2 className="text-2xl font-semibold tracking-tight" id="about-plugins">{t("about.pluginsTitle")}</h2>
        <p className="mt-2 max-w-3xl text-base text-muted-foreground">{t("about.pluginsDescription")}</p>
        <div className="mt-6 grid gap-x-10 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
          {PLUGIN_CATEGORIES.map((category) => {
            const categoryPlugins = plugins.filter((plugin) => plugin.category === category);

            if (categoryPlugins.length === 0) {
              return null;
            }

            return (
              <div key={category}>
                <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                  {t(`plugins.categories.${category}`)}
                </h3>
                <ul className="mt-3 flex flex-col gap-3">
                  {categoryPlugins.map((plugin) => (
                    <li key={plugin.id} className="min-w-0">
                      <p className="flex flex-wrap items-baseline gap-x-2">
                        <a
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                          href={plugin.docsUrl}
                          rel="noopener"
                          target="_blank"
                        >
                          {plugin.name}
                        </a>
                        <span className="font-mono text-xs wrap-anywhere text-muted-foreground">{plugin.packageName}</span>
                      </p>
                      <p className="mt-0.5 text-sm leading-6 text-muted-foreground">{t(`plugins.descriptions.${plugin.id}`)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="about-faq" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-12">
        <div className="lg:sticky lg:top-8 lg:self-start">
          <h2 className="text-2xl font-semibold tracking-tight" id="about-faq">{t("about.faqTitle")}</h2>
          <p className="mt-2 max-w-sm text-base text-muted-foreground">
            {t.rich("about.faqDescription", {
              link: (chunks) => (
                <a className="font-medium text-foreground underline underline-offset-4" href={`${brand.repositoryUrl}/issues`} rel="noreferrer" target="_blank">
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>
        {/* Native <details> keeps every answer in the HTML for search engines while it is collapsed. */}
        <div className="flex flex-col gap-3">
          {FAQ_IDS.map((faqId) => (
            <details
              key={faqId}
              className="group rounded-lg border border-border bg-card transition-shadow open:shadow-sm"
              data-slot="faq-item"
            >
              <summary
                className="
                  flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-5 py-4 transition-colors outline-none
                  hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring
                  [&::-webkit-details-marker]:hidden
                "
              >
                <h3 className="text-[0.9375rem] font-medium">{t(`about.faq.${faqId}.question`)}</h3>
                <span
                  aria-hidden="true"
                  className="
                    flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground
                    transition-transform duration-200 group-open:rotate-45
                  "
                >
                  <PlusIcon className="size-3.5" />
                </span>
              </summary>
              <p className="max-w-prose px-5 pb-5 text-sm leading-6 text-muted-foreground">
                {t.rich(`about.faq.${faqId}.answer`, {
                  code,
                  link: (chunks) => (
                    <a className="font-medium text-foreground underline underline-offset-4" href={brand.repositoryUrl} rel="noreferrer" target="_blank">
                      {chunks}
                    </a>
                  ),
                })}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
