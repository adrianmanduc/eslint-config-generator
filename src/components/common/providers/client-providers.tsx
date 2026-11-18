"use client";

import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast";

import { QueryProvider } from "./react-query-provider";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <AnchoredToastProvider>{children}</AnchoredToastProvider>
      </ToastProvider>
    </QueryProvider>
  );
}
