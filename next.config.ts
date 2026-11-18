import createNextIntlPlugin from "next-intl/plugin";

import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin({
  requestConfig: "./src/i18n/request.ts",
  experimental: {
    // Generates typed declarations for each messages file. Register new
    // namespaces here and in src/i18n/messages.ts.
    createMessagesDeclaration: [
      "./messages/en/common.json",
      "./messages/en/generator.json",
      "./messages/en/theme-playground.json",
    ],
  },
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
};

export default withNextIntl(nextConfig);
