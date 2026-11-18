import { appConfig } from "@/config";
import { getText } from "@/i18n/get-text";
import { brand } from "@/utils/brand";

import { FAQ_IDS } from "./about";

// Plain text for the markup used in the FAQ copy.
const toText = (chunks: string) => chunks;

/**
 * schema.org data for search engines: the page is a free web application, and
 * its FAQ section is a FAQPage. Built from the same copy as the visible page.
 */
export async function StructuredData() {
  const t = await getText("generator.about.faq");
  const tCommon = await getText("common");
  const url = `${appConfig.site.url}/`;

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${url}#app`,
        name: brand.name,
        url,
        description: tCommon("description"),
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        // The author URL carries tracking parameters for the visible link.
        author: { "@type": "Person", name: brand.author.name, url: new URL(brand.author.url).origin },
        sameAs: [brand.repositoryUrl],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: FAQ_IDS.map((faqId) => ({
          "@type": "Question",
          name: t(`${faqId}.question`),
          acceptedAnswer: {
            "@type": "Answer",
            text: t.markup(`${faqId}.answer`, { code: toText, link: toText }),
          },
        })),
      },
    ],
  };

  return (
    <script
      // Escape "<" so no copy can close the script element early.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replaceAll("<", "\\u003c") }}
      type="application/ld+json"
    />
  );
}
