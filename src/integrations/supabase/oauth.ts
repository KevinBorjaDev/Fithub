import { useQuery } from "@tanstack/react-query";

import { supabase } from "./client";

/** Proveedores sociales que ofrece la pantalla de acceso. */
export type OAuthProvider = "google" | "apple";

/**
 * Inicia el flujo OAuth contra Supabase (redirección al proveedor y vuelta a la
 * app). Devuelve el error si Supabase lo rechaza; si todo va bien el navegador
 * ya está navegando fuera y la promesa no llega a resolverse en la práctica.
 */
export async function signInWithProvider(provider: OAuthProvider) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
  return { error };
}

type AuthSettings = {
  external?: Partial<Record<OAuthProvider, boolean>>;
};

/**
 * Pregunta a Supabase qué proveedores sociales están habilitados en el proyecto.
 * Así los botones se activan solos cuando se configuran Google o Apple en el
 * dashboard, en vez de ofrecer un botón que falla al pulsarlo.
 */
async function fetchEnabledProviders(): Promise<Record<OAuthProvider, boolean>> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
  if (!res.ok) throw new Error("No se pudo consultar la configuración de acceso");
  const settings = (await res.json()) as AuthSettings;
  return {
    google: settings.external?.google === true,
    apple: settings.external?.apple === true,
  };
}

export function useEnabledOAuthProviders() {
  return useQuery({
    queryKey: ["auth", "settings", "providers"],
    queryFn: fetchEnabledProviders,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
