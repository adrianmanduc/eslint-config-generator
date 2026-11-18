"use client";

import { ArrowUpIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { useText } from "@/hooks/use-text";

/** How far down the page (in pixels) the button appears. */
const VISIBLE_AFTER = 600;

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });

  return () => window.removeEventListener("scroll", onChange);
}

const getSnapshot = () => window.scrollY > VISIBLE_AFTER;

const getServerSnapshot = () => false;

/** A floating button that returns to the top of a long page. */
export function ScrollToTop() {
  const t = useText("common");
  const isVisible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!isVisible) {
    return null;
  }

  return (
    <Button
      iconOnly
      aria-label={t("scrollToTop")}
      className="fixed right-4 bottom-4 z-30 rounded-full shadow-lg sm:right-6 sm:bottom-6"
      color="primary"
      title={t("scrollToTop")}
      // Smooth scrolling, and its reduced-motion opt-out, come from the global CSS.
      onClick={() => window.scrollTo({ top: 0 })}
    >
      <ArrowUpIcon aria-hidden="true" />
    </Button>
  );
}
