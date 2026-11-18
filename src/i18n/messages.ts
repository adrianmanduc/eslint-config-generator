import common from "../../messages/en/common.json";
import generator from "../../messages/en/generator.json";
import themePlayground from "../../messages/en/theme-playground.json";

import type { AppLocale } from "./config";

/**
 * Every file in messages/en is one namespace. Register new files here (and in
 * next.config.ts when the i18n module is enabled); messages.test.ts checks it.
 */
export const messages = {
  common,
  generator,
  themePlayground,
} as const;

const messagesByLocale: Record<AppLocale, typeof messages> = {
  en: messages,
};

export function getMessages(locale: AppLocale) {
  return messagesByLocale[locale];
}
