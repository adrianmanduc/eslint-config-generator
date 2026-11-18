import { LocalStorage, localStorageKeys } from "@/lib/storage";

/**
 * The guided tour: a short walk through the parts of the generator. It opens
 * by itself on a visitor's first visit and can be restarted from the header.
 *
 * Each step points at the element marked with `data-tour="<target>"`. Several
 * elements may share a target (the output panel and, on small screens, the
 * switch that reveals it); the tour uses whichever is visible.
 */
export const TOUR_STEPS = [
  { id: "welcome", target: null },
  { id: "setup", target: "setup" },
  { id: "plugins", target: "plugins" },
  { id: "rules", target: "rules" },
  { id: "output", target: "output" },
] as const;

export type TourStepId = (typeof TOUR_STEPS)[number]["id"];

/** The current step index, or null while the tour is closed. */
let currentStep: number | null = null;
let isInitialized = false;

const listeners = new Set<() => void>();

function setStep(step: number | null) {
  currentStep = step;
  listeners.forEach((listener) => listener());
}

export function subscribeToTour(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getTourStep() {
  // Decide once, on the first read in the browser, whether this is a first visit.
  if (!isInitialized) {
    isInitialized = true;
    currentStep = LocalStorage.get(localStorageKeys.tourSeen) === true ? null : 0;
  }

  return currentStep;
}

export function startTour() {
  isInitialized = true;
  setStep(0);
}

export function goToTourStep(step: number) {
  if (step >= 0 && step < TOUR_STEPS.length) {
    setStep(step);
  }
}

/** Closes the tour and remembers that this visitor has seen it. */
export function endTour() {
  LocalStorage.set(localStorageKeys.tourSeen, true);
  setStep(null);
}

/** The visible element a step points at, if it has one. */
export function findTourTarget(target: string | null) {
  if (!target) {
    return null;
  }

  const candidates = [...document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)];

  // `offsetParent` is null for an element hidden with `display: none`.
  return candidates.find((element) => element.offsetParent !== null) ?? null;
}
