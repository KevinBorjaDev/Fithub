import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { signInWithProvider, useEnabledOAuthProviders } from "@/integrations/supabase/oauth";
import { useAuth } from "@/hooks/use-auth";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar — Lic. Diego Rivera" },
      {
        name: "description",
        content:
          "Ingresa a tu panel personal para gestionar tu plan de nutrición y entrenamiento con el Lic. Diego Rivera.",
      },
      { property: "og:title", content: "Ingresar — Lic. Diego Rivera" },
      {
        property: "og:description",
        content:
          "Accede a tu seguimiento personal de nutrición, entrenamiento y progreso con el Lic. Diego Rivera.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Correo inválido").max(255);
const passwordSchema = z.string().min(8, "Mínimo 8 caracteres").max(72);

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const providers = useEnabledOAuthProviders();
  const anyProviderEnabled = Boolean(providers.data?.google || providers.data?.apple);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [session, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRes = emailSchema.safeParse(email);
    const passRes = passwordSchema.safeParse(password);
    if (!emailRes.success) return toast.error(emailRes.error.issues[0].message);
    if (!passRes.success) return toast.error(passRes.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: emailRes.data,
      password: passRes.data,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("¡Bienvenido!");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRes = emailSchema.safeParse(email);
    const passRes = passwordSchema.safeParse(password);
    if (!emailRes.success) return toast.error(emailRes.error.issues[0].message);
    if (!passRes.success) return toast.error(passRes.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: emailRes.data,
      password: passRes.data,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName.trim() || undefined },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Cuenta creada. Ya puedes ingresar.");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRes = emailSchema.safeParse(email);
    if (!emailRes.success) return toast.error(emailRes.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(emailRes.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Revisa tu correo para restablecer la contraseña.");
  };

  const handleOAuth = async (provider: "google" | "apple", label: string) => {
    setBusy(true);
    const { error } = await signInWithProvider(provider);
    if (error) {
      setBusy(false);
      toast.error(`No se pudo iniciar sesión con ${label}`);
    }
  };

  return (
    <main
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <BrandLogo size="lg" />
        </div>

        <Card className="border-border/60" style={{ boxShadow: "var(--shadow-elegant)" }}>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Accede a tu panel</CardTitle>
            <CardDescription>Tu nutrición y entrenamiento, en un solo lugar.</CardDescription>
          </CardHeader>
          <CardContent>
            {mode === "forgot" ? (
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fp-email">Correo</Label>
                  <Input
                    id="fp-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  Enviar enlace
                </Button>
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-sm text-muted-foreground hover:text-foreground w-full text-center"
                >
                  Volver
                </button>
              </form>
            ) : (
              <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="signin">Ingresar</TabsTrigger>
                  <TabsTrigger value="signup">Registrarme</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="space-y-4 mt-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="si-email">Correo</Label>
                      <Input
                        id="si-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="si-pass">Contraseña</Label>
                        <button
                          type="button"
                          onClick={() => setMode("forgot")}
                          className="text-xs text-muted-foreground hover:text-primary"
                        >
                          ¿Olvidaste?
                        </button>
                      </div>
                      <Input
                        id="si-pass"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      Ingresar
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4 mt-4">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="su-name">Nombre completo</Label>
                      <Input
                        id="su-name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="su-email">Correo</Label>
                      <Input
                        id="su-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="su-pass">Contraseña</Label>
                      <Input
                        id="su-pass"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      Crear cuenta
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}

            {mode !== "forgot" && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">o continúa con</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOAuth("google", "Google")}
                  disabled={busy || !providers.data?.google}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                    <path
                      fill="#EA4335"
                      d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1a6.2 6.2 0 1 1 0-12.4 5.6 5.6 0 0 1 4 1.5l2.7-2.6A9.7 9.7 0 0 0 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.3-.2-2H12z"
                    />
                  </svg>
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => handleOAuth("apple", "Apple")}
                  disabled={busy || !providers.data?.apple}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden fill="currentColor">
                    <path d="M16.365 12.72c-.02-2.03 1.66-3.01 1.73-3.06-.94-1.38-2.41-1.57-2.93-1.59-1.25-.13-2.44.73-3.08.73-.64 0-1.62-.71-2.67-.69-1.37.02-2.64.8-3.35 2.03-1.43 2.48-.36 6.15 1.02 8.17.68.99 1.48 2.1 2.53 2.06 1.02-.04 1.4-.66 2.63-.66 1.23 0 1.58.66 2.65.64 1.09-.02 1.79-1 2.46-1.99.78-1.14 1.1-2.25 1.11-2.31-.02-.01-2.13-.82-2.15-3.24zM14.4 6.36c.56-.68.94-1.62.84-2.56-.81.03-1.79.54-2.37 1.22-.52.6-.97 1.56-.85 2.48.9.07 1.82-.46 2.38-1.14z" />
                  </svg>
                  Apple
                </Button>
                {!providers.isLoading && !anyProviderEnabled && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    El acceso con Google y Apple aún no está disponible. Ingresa con tu correo y
                    contraseña.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            ← Volver
          </Link>
        </p>
      </div>
    </main>
  );
}
