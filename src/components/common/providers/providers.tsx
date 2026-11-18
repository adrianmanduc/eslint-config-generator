import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import { formats } from "@/i18n/formats";

import { ClientProviders } from "./client-providers";

export async function Providers({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider formats={formats} messages={messages}>
      <ClientProviders>{children}</ClientProviders>
    </NextIntlClientProvider>
  );
}
