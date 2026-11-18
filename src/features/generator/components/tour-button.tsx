"use client";

import { CircleHelpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useText } from "@/hooks/use-text";

import { startTour } from "../tour";

/** Restarts the guided tour. Lives in the page header. */
export function TourButton() {
  const t = useText("generator.tour");

  return (
    <Button
      color="secondary"
      size="sm"
      startContent={<CircleHelpIcon aria-hidden="true" />}
      title={t("restart")}
      variant="ghost"
      onClick={startTour}
    >
      <span className="max-sm:sr-only">{t("restart")}</span>
    </Button>
  );
}
