"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import { useText } from "@/hooks/use-text";

function GeneratorSkeleton() {
  const t = useText("generator");

  return (
    <div aria-busy="true" aria-label={t("loading")} className="flex flex-col gap-6" role="status">
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem] xl:grid-cols-[15rem_minmax(0,1fr)_30rem]">
        <Skeleton className="hidden h-96 xl:block" />
        <Skeleton className="h-128" />
        <Skeleton className="h-128" />
      </div>
    </div>
  );
}

/**
 * Renders the generator in the browser only: it restores its state from
 * localStorage on the first render, which a server render could not match.
 */
export const GeneratorLoader = dynamic(
  () => import("./generator").then((module) => ({ default: module.Generator })),
  { ssr: false, loading: GeneratorSkeleton },
);
