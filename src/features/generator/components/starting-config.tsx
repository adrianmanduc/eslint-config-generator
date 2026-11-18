"use client";

import { useEffect, useEffectEvent, useState } from "react";

import { ConfirmationDialog } from "@/components/common/confirmation-dialog";
import { toastManager } from "@/components/ui/toast";
import { useText } from "@/hooks/use-text";

import { presets } from "../presets";
import { clearShareHash, decodeSharedState, readShareHash } from "../share";
import { createEmptyState, createStateFromPreset } from "../state";

import type { PresetId } from "../presets";
import type { GeneratorState } from "../types";
import type { GeneratorDispatch } from "../use-generator-state";

const isSameState = (a: GeneratorState, b: GeneratorState) => JSON.stringify(a) === JSON.stringify(b);

/** True while the visitor has not changed anything since picking a preset or starting over. */
function isUntouched(state: GeneratorState) {
  return isSameState(state, createEmptyState(state))
    || presets.some((preset) => isSameState(state, createStateFromPreset(preset.id, state)));
}

type Pending = { kind: "shared", state: GeneratorState } | { kind: "preset", state: GeneratorState, presetId: PresetId };

type StartingConfigProps = {
  state: GeneratorState,
  dispatch: GeneratorDispatch,
  /** The preset of the page the generator is on, if it is a preset page. */
  presetId?: PresetId
};

/**
 * Decides what the editor starts from. A config shared by link (`#config=…`)
 * wins; on a preset page (/nextjs, …) it is that preset. An untouched editor
 * takes it straight away; otherwise the visitor confirms before their own
 * setup is replaced.
 */
export function StartingConfig({ dispatch, presetId, state }: StartingConfigProps) {
  const t = useText("generator");
  const [pending, setPending] = useState<Pending | null>(null);

  const load = (next: Pending) => {
    dispatch({ type: "replace", state: next.state });

    if (next.kind === "shared") {
      toastManager.add({ title: t("share.loaded"), type: "success" });
    }
  };

  const offer = (next: Pending) => {
    if (isSameState(state, next.state)) {
      return;
    }

    if (isUntouched(state)) {
      load(next);
    } else {
      setPending(next);
    }
  };

  const openFromHash = useEffectEvent(async () => {
    const value = readShareHash();

    if (value === null) {
      return false;
    }

    // Clear first, so a reload or a second effect run does not import it again.
    clearShareHash();

    const shared = await decodeSharedState(value);

    if (shared) {
      offer({ kind: "shared", state: shared });
    } else {
      toastManager.add({ description: t("share.invalidDescription"), title: t("share.invalidTitle"), type: "error" });
    }

    return true;
  });

  const start = useEffectEvent(async () => {
    const opened = await openFromHash();

    if (!opened && presetId) {
      offer({ kind: "preset", presetId, state: createStateFromPreset(presetId, state) });
    }
  });

  useEffect(() => {
    // The URL hash is an external source, and the state only changes after the
    // asynchronous decode, never synchronously in this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    void start();

    // A link pasted into the address bar of an open tab only changes the hash.
    const handleHashChange = () => void openFromHash();

    window.addEventListener("hashchange", handleHashChange);

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const presetName = pending?.kind === "preset" ? t(`presets.items.${pending.presetId}.name`) : "";

  return (
    <ConfirmationDialog
      cancelLabel={pending?.kind === "preset" ? t("presets.start.cancel") : t("share.cancel")}
      confirmLabel={pending?.kind === "preset" ? t("presets.start.confirm", { name: presetName }) : t("share.confirm")}
      description={pending?.kind === "preset" ? t("presets.start.confirmDescription", { name: presetName }) : t("share.confirmDescription")}
      open={pending !== null}
      title={pending?.kind === "preset" ? t("presets.start.confirmTitle", { name: presetName }) : t("share.confirmTitle")}
      onConfirm={() => {
        if (pending) {
          load(pending);
        }
      }}
      onOpenChange={(open) => {
        if (!open) {
          setPending(null);
        }
      }}
    />
  );
}
