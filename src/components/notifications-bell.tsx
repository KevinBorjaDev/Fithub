import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type AppNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

function AppleDumbbellIcon({ className }: { className?: string }) {
  // Custom mark: apple silhouette with an integrated dumbbell across the middle.
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* leaf */}
      <path
        d="M13 4c1.2-1.2 3-1.6 4-1.4-.2 1.4-1 3-2.2 3.8"
        fill="currentColor"
        fillOpacity="0.15"
      />
      {/* stem */}
      <path d="M12 5.5V4" />
      {/* apple body */}
      <path
        d="M12 5.6c-1.6-1.1-3.6-1.2-5.1-.1C4.9 6.9 4 9.2 4 11.7c0 4.3 3 9.3 6 9.3 1 0 1.4-.5 2-.5s1 .5 2 .5c3 0 6-5 6-9.3 0-2.5-.9-4.8-2.9-6.2-1.5-1.1-3.5-1-5.1.1z"
        fill="currentColor"
        fillOpacity="0.12"
      />
      {/* dumbbell bar */}
      <path d="M7.5 13h9" strokeWidth="2.2" />
      {/* left weights */}
      <path d="M6 11.4v3.2M7.5 10.6v4.8" strokeWidth="2.2" />
      {/* right weights */}
      <path d="M18 11.4v3.2M16.5 10.6v4.8" strokeWidth="2.2" />
    </svg>
  );
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  // Ask for browser notification permission once (best-effort).
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      // Delay a moment to not block first render
      const t = setTimeout(() => {
        Notification.requestPermission().catch(() => {});
      }, 3000);
      return () => clearTimeout(t);
    }
  }, []);

  const { data: items = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
    refetchOnWindowFocus: true,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["notifications", user.id] });
          if (
            payload.eventType === "INSERT" &&
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            const n = payload.new as AppNotification;
            try {
              const notif = new Notification(n.title, {
                body: n.body ?? undefined,
                icon: "/icon-192.png",
                badge: "/icon-192.png",
                tag: n.id,
              });
              notif.onclick = () => {
                window.focus();
                if (n.link) window.location.assign(n.link);
                notif.close();
              };
            } catch {
              /* noop */
            }
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  const unread = useMemo(() => items.filter((n) => !n.read_at).length, [items]);

  async function markAllRead() {
    if (!user?.id || unread === 0) return;
    await (supabase as any)
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null)
      .eq("user_id", user.id);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  }

  async function markRead(id: string) {
    await (supabase as any)
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
  }

  async function removeAll() {
    if (!user?.id) return;
    await (supabase as any).from("notifications").delete().eq("user_id", user.id);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  }

  async function handleClick(n: AppNotification) {
    await markRead(n.id);
    setOpen(false);
    if (n.link) navigate({ to: n.link as string });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          aria-label={`Notificaciones${unread ? ` (${unread} sin leer)` : ""}`}
        >
          <AppleDumbbellIcon className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-[min(92vw,420px)] flex-col gap-0 border-r border-border/70 bg-card p-0 sm:max-w-md"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-4 pr-12">
          <SheetHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <AppleDumbbellIcon className="h-5 w-5 text-primary" />
              <SheetTitle className="text-base">Notificaciones</SheetTitle>
            </div>
            <SheetDescription>
              Alertas del plan nutricional, entrenamiento y nueva información.
            </SheetDescription>
          </SheetHeader>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={markAllRead}
              title="Marcar todo como leído"
              disabled={unread === 0}
            >
              <CheckCheck className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={removeAll}
              title="Borrar todas"
              disabled={items.length === 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No tienes notificaciones aún.
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={cn(
                      "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent",
                      !n.read_at && "bg-primary/5",
                    )}
                  >
                    <div className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
                      <AppleDumbbellIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "truncate text-sm",
                            !n.read_at ? "font-semibold" : "font-medium text-foreground/90",
                          )}
                        >
                          {n.title}
                        </p>
                        {!n.read_at && (
                          <span className="h-1.5 w-1.5 flex-none rounded-full bg-primary" />
                        )}
                      </div>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {formatWhen(n.created_at)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
