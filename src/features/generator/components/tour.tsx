"use client";

import { XIcon } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { useText } from "@/hooks/use-text";
import { cn } from "@/utils/styles";

import {
  TOUR_STEPS, endTour, findTourTarget, getTourStep, goToTourStep, subscribeToTour,
} from "../tour";

const ACTIVE_ATTRIBUTE = "data-tour-active";

// The tour only renders inside the browser-only generator.
const getServerSnapshot = () => null;

/**
 * The tour card. It stays in a corner of the screen and highlights the part of
 * the page each step talks about, so it never has to be positioned against it.
 */
export function Tour() {
  const t = useText("generator.tour");
  const stepIndex = useSyncExternalStore(subscribeToTour, getTourStep, getServerSnapshot);
  const step = stepIndex === null ? undefined : TOUR_STEPS[stepIndex];

  useEffect(() => {
    const element = step ? findTourTarget(step.target) : null;

    if (!element) {
      return undefined;
    }

    // The highlight itself is styled in src/styles/components.css.
    element.setAttribute(ACTIVE_ATTRIBUTE, "");
    // Align to the top: the card sits at the bottom of the screen, and some
    // targets (the rule list) are far taller than the viewport.
    // Jump rather than animate: steps can be a long way apart on a phone.
    element.scrollIntoView({ block: "start", behavior: "instant" });

    return () => element.removeAttribute(ACTIVE_ATTRIBUTE);
  }, [step]);

  useEffect(() => {
    if (!step) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        endTour();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step]);

  if (!step || stepIndex === null) {
    return null;
  }

  const isLastStep = stepIndex === TOUR_STEPS.length - 1;

  return (
    <div
      aria-describedby="tour-body"
      aria-labelledby="tour-title"
      className="
        fixed inset-x-4 bottom-4 z-40 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-xl
        sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96
      "
      role="dialog"
    >
      <div className="flex items-start justify-between gap-3">
        {/* One segment per step; the step count is still announced to screen readers. */}
        <div
          aria-label={t("progress", { current: String(stepIndex + 1), total: String(TOUR_STEPS.length) })}
          aria-valuemax={TOUR_STEPS.length}
          aria-valuemin={1}
          aria-valuenow={stepIndex + 1}
          className="mt-1 flex w-24 gap-1"
          role="progressbar"
        >
          {TOUR_STEPS.map((tourStep, index) => (
            <span
              key={tourStep.id}
              className={cn("h-1 flex-1 rounded-full transition-colors", index <= stepIndex ? "bg-brand" : "bg-border")}
            />
          ))}
        </div>
        <Button
          iconOnly
          aria-label={t("skip")}
          className="-mt-1.5 -mr-1.5 size-7"
          color="secondary"
          title={t("skip")}
          variant="ghost"
          onClick={endTour}
        >
          <XIcon aria-hidden="true" />
        </Button>
      </div>
      {/* Announced when the step changes. */}
      <div aria-live="polite">
        <h2 className="mt-1 text-base font-semibold" id="tour-title">{t(`steps.${step.id}.title`)}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground" id="tour-body">{t(`steps.${step.id}.body`)}</p>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <Button color="secondary" size="sm" variant="ghost" onClick={endTour}>
          {t("skip")}
        </Button>
        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <Button color="secondary" size="sm" variant="outline" onClick={() => goToTourStep(stepIndex - 1)}>
              {t("back")}
            </Button>
          )}
          <Button color="brand" size="sm" onClick={() => (isLastStep ? endTour() : goToTourStep(stepIndex + 1))}>
            {isLastStep ? t("done") : t("next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
