"use client";

import { useEffect, useReducer } from "react";

import { LocalStorage, localStorageKeys } from "@/lib/storage";

import { createDefaultState, generatorReducer, parseStoredState } from "./state";

import type { GeneratorAction } from "./state";
import type { Dispatch } from "react";

export type GeneratorDispatch = Dispatch<GeneratorAction>;

/**
 * The generator state, restored from and saved to localStorage. The storage is
 * read during the first render, so the component using this hook must only
 * render in the browser.
 */
export function useGeneratorState() {
  const [state, dispatch] = useReducer(
    generatorReducer,
    null,
    () => parseStoredState(LocalStorage.get(localStorageKeys.generatorState)) ?? createDefaultState(),
  );

  useEffect(() => {
    LocalStorage.set(localStorageKeys.generatorState, state);
  }, [state]);

  return [state, dispatch] as const;
}
