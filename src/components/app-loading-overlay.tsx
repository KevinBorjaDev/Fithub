import { useIsMutating } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { LOADING_LOGO_URL } from "@/lib/assets";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type AppLoadingEvent = CustomEvent<{ label?: string }>;

function useManualLoading() {
  const [manualCount, setManualCount] = useState(0);
  const [label, setLabel] = useState("Cargando tu plataforma…");

  useEffect(() => {
    const start = (event: Event) => {
      const detail = (event as AppLoadingEvent).detail;
      setLabel(detail?.label ?? "Cargando tu plataforma…");
      setManualCount((count) => count + 1);
    };

    const end = () => {
      setManualCount((count) => Math.max(0, count - 1));
    };

    window.addEventListener("dr-loading-start", start);
    window.addEventListener("dr-loading-end", end);

    return () => {
      window.removeEventListener("dr-loading-start", start);
      window.removeEventListener("dr-loading-end", end);
    };
  }, []);

  return { isManualLoading: manualCount > 0, label };
}

function useSmoothOverlay(active: boolean) {
  const [rendered, setRendered] = useState(active);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let timer: number | undefined;

    if (active) {
      setLeaving(false);
      timer = window.setTimeout(() => setRendered(true), rendered ? 0 : 120);
      return () => window.clearTimeout(timer);
    }

    if (rendered) {
      setLeaving(true);
      timer = window.setTimeout(() => {
        setRendered(false);
        setLeaving(false);
      }, 360);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [active, rendered]);

  return { rendered, leaving };
}

export function AppLoadingOverlay() {
  const { loading } = useAuth();
  const mutatingCount = useIsMutating();
  const routerBusy = useRouterState({
    select: (state) => state.status === "pending" || state.isLoading || state.isTransitioning,
  });
  const { isManualLoading, label } = useManualLoading();
  const active = loading || routerBusy || mutatingCount > 0 || isManualLoading;
  const { rendered, leaving } = useSmoothOverlay(active);

  if (!rendered) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] grid place-items-center overflow-hidden px-6 transition-opacity duration-300",
        leaving ? "opacity-0" : "opacity-100",
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="absolute inset-0 bg-background/75 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_48%)]" />

      <div className="relative flex flex-col items-center gap-5 text-center">
        <div className="app-loading-logo-shell">
          <img
            src={LOADING_LOGO_URL}
            alt="Diego Rivera Nutricionista"
            className="app-loading-logo h-full w-full object-cover"
            decoding="async"
            loading="eager"
          />
        </div>

        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-secondary/80 shadow-inner">
          <div className="app-loading-bar h-full w-2/5 rounded-full" />
        </div>

        <p className="text-sm font-medium text-foreground/90">{label}</p>
      </div>
    </div>
  );
}
