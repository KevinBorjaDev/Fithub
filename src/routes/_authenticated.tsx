import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogOut, LayoutDashboard, ShieldCheck, ShieldAlert } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { NotificationsBell } from "@/components/notifications-bell";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, loading, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["me", "active", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", session!.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (loading || !session) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  const isBlocked = !isAdmin && !profileLoading && profile && profile.is_active === false;
  if (isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div
          className="max-w-md w-full rounded-xl border border-border/60 bg-card p-8 text-center space-y-4"
          style={{ boxShadow: "var(--shadow-elegant)" }}
        >
          <div
            className="mx-auto h-12 w-12 rounded-full flex items-center justify-center"
            style={{ background: "var(--gradient-primary)" }}
          >
            <ShieldAlert className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold">Cuenta inactiva</h1>
          <p className="text-sm text-muted-foreground">
            Tu acceso a la plataforma está desactivado. Por favor, contacta al Lic. Diego Rivera
            para reactivar tu cuenta.
          </p>
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border/60 bg-card/50 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <Link to="/dashboard" className="hover:opacity-80 transition-opacity">
              <BrandLogo size="sm" />
            </Link>
          </div>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Panel</span>
              </Link>
            </Button>
            {isAdmin && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
