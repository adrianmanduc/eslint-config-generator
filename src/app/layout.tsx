import { Analytics } from "@vercel/analytics/next";

import { font } from "@/components/common/fonts";
import { Providers } from "@/components/common/providers";
import { appConfig } from "@/config";
import { getText } from "@/i18n/get-text";
import { themeInitScript } from "@/lib/theme";
import { brand } from "@/utils/brand";

import "@/styles/index.css";

import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getText("common");

  const title = `${t("title")} | ${brand.name}`;

  return {
    // Relative to metadataBase. Share links only add a hash, and tracking
    // parameters (?utm_source=…) must not become pages of their own.
    alternates: { canonical: "/" },
    applicationName: brand.name,
    description: t("description"),
    metadataBase: new URL(appConfig.site.url),
    openGraph: {
      description: t("description"),
      siteName: brand.name,
      title,
      type: "website",
      url: "/",
    },
    title: {
      default: title,
      template: `%s | ${brand.name}`,
    },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script sets a class on <html> before hydration, which React must not flag.
    <html suppressHydrationWarning className={`${font.variable} font-sans`} lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
        {/* Cookieless page views; it only reports on Vercel deployments. */}
        <Analytics />
      </body>
    </html>
  );
}
