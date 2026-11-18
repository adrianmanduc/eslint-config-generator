"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { useText } from "@/hooks/use-text";
import { isDarkTheme, setDarkTheme, subscribeToTheme } from "@/lib/theme";

// The server cannot know the theme; the inline script in the root layout has
// already applied it by the time this hydrates.
const getServerSnapshot = () => false;

export function ThemeToggle() {
  const t = useText("common.theme");
  const isDark = useSyncExternalStore(subscribeToTheme, isDarkTheme, getServerSnapshot);
  const label = isDark ? t("toLight") : t("toDark");

  return (
    <Button
      iconOnly
      aria-label={label}
      color="secondary"
      size="sm"
      title={label}
      variant="ghost"
      onClick={() => setDarkTheme(!isDark)}
    >
      {isDark ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" />}
    </Button>
  );
}
