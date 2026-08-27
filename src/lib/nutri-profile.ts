import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const NUTRI_BUCKET = "nutri-profile";

export type NutriItem = { title: string; subtitle?: string };

export type NutriProfile = {
  id: string;
  photo_path: string | null;
  name: string;
  role_title: string;
  panel_title: string;
  cta_label: string;
  who_title: string;
  who_body: string | null;
  why_title: string;
  why_body: string | null;
  academic_title: string;
  academic_items: NutriItem[];
  professional_title: string;
  professional_items: NutriItem[];
  athletes_title: string;
  athletes_items: NutriItem[];
  personal_title: string;
  personal_body: string | null;
  personal_items: string[];
  message_title: string;
  message_body: string | null;
  section_order: string[];
  is_visible: boolean;
};

export type NutriPhoto = {
  id: string;
  storage_path: string;
  caption: string | null;
  section: string;
  sort_order: number;
};

function asItems(value: unknown): NutriItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
    .map((v) => ({ title: String(v.title ?? ""), subtitle: v.subtitle ? String(v.subtitle) : "" }))
    .filter((v) => v.title.length > 0);
}

function asStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).filter((v) => v.trim().length > 0);
}

export function normalizeProfile(row: Record<string, unknown> | null): NutriProfile | null {
  if (!row) return null;
  return {
    ...(row as unknown as NutriProfile),
    academic_items: asItems(row.academic_items),
    professional_items: asItems(row.professional_items),
    athletes_items: asItems(row.athletes_items),
    personal_items: asStrings(row.personal_items),
    section_order: asStrings(row.section_order),
  };
}

export function useNutriProfile() {
  return useQuery({
    queryKey: ["nutri-profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutri_profile")
        .select("*")
        .eq("id", "main")
        .maybeSingle();
      if (error) throw error;
      return normalizeProfile(data as Record<string, unknown> | null);
    },
  });
}

export function useNutriPhotos() {
  return useQuery({
    queryKey: ["nutri-photos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutri_photos")
        .select("id, storage_path, caption, section, sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as NutriPhoto[];
    },
  });
}

export function useSignedUrls(paths: string[]) {
  const key = paths.join("|");
  return useQuery({
    queryKey: ["nutri-signed", key],
    enabled: paths.length > 0,
    staleTime: 45 * 60 * 1000,
    queryFn: async () => {
      const map: Record<string, string> = {};
      await Promise.all(
        paths.map(async (p) => {
          const { data } = await supabase.storage.from(NUTRI_BUCKET).createSignedUrl(p, 3600);
          if (data?.signedUrl) map[p] = data.signedUrl;
        }),
      );
      return map;
    },
  });
}
