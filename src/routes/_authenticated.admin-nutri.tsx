import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Camera,
  Loader2,
  Plus,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NUTRI_BUCKET,
  useNutriPhotos,
  useNutriProfile,
  useSignedUrls,
  type NutriItem,
  type NutriProfile,
} from "@/lib/nutri-profile";

export const Route = createFileRoute("/_authenticated/admin-nutri")({
  head: () => ({
    meta: [
      { title: "Conoce a tu Nutri — Administración" },
      {
        name: "description",
        content: "Gestiona el contenido, fotografías y visibilidad del panel Conoce a tu Nutri.",
      },
      { property: "og:title", content: "Conoce a tu Nutri — Administración" },
      {
        property: "og:description",
        content: "Edita la información profesional y las fotografías del nutricionista deportivo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminNutriPage,
});

const SECTIONS: { id: string; label: string }[] = [
  { id: "who", label: "¿Quién soy?" },
  { id: "why", label: "¿Por qué Nutrición Deportiva?" },
  { id: "academic", label: "Logros académicos" },
  { id: "professional", label: "Logros profesionales" },
  { id: "athletes", label: "Deportistas y pacientes" },
  { id: "personal", label: "Logros personales" },
  { id: "message", label: "Mensaje para mi paciente" },
];

const PHOTO_SECTIONS = [{ id: "gallery", label: "Galería general" }, ...SECTIONS];

function ItemsEditor({
  items,
  onChange,
  labelTitle = "Título",
  labelSubtitle = "Detalle",
}: {
  items: NutriItem[];
  onChange: (v: NutriItem[]) => void;
  labelTitle?: string;
  labelSubtitle?: string;
}) {
  const update = (i: number, patch: Partial<NutriItem>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-lg border border-border/60 p-3 space-y-2 bg-muted/20">
          <Input
            value={it.title}
            placeholder={labelTitle}
            onChange={(e) => update(i, { title: e.target.value })}
          />
          <Input
            value={it.subtitle ?? ""}
            placeholder={labelSubtitle}
            onChange={(e) => update(i, { subtitle: e.target.value })}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => move(i, -1)}
              aria-label="Subir"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => move(i, 1)}
              aria-label="Bajar"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              aria-label="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onChange([...items, { title: "", subtitle: "" }])}
      >
        <Plus className="h-4 w-4 mr-2" /> Agregar
      </Button>
    </div>
  );
}

function ListEditor({ items, onChange }: { items: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            value={it}
            onChange={(e) => onChange(items.map((v, idx) => (idx === i ? e.target.value : v)))}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            aria-label="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, ""])}>
        <Plus className="h-4 w-4 mr-2" /> Agregar
      </Button>
    </div>
  );
}

function AdminNutriPage() {
  const { isAdmin, loading, user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useNutriProfile();
  const { data: photos } = useNutriPhotos();
  const [form, setForm] = useState<NutriProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [gallerySection, setGallerySection] = useState("gallery");
  const mainRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile && !form) setForm(profile);
  }, [profile, form]);

  const paths = useMemo(() => {
    const list = (photos ?? []).map((p) => p.storage_path);
    if (form?.photo_path) list.push(form.photo_path);
    return list;
  }, [photos, form?.photo_path]);
  const { data: urls } = useSignedUrls(paths);
  const urlMap = urls ?? {};

  if (loading) return <div className="min-h-[40vh]" aria-hidden />;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <ShieldAlert className="h-10 w-10 text-primary mx-auto" />
        <h1 className="text-lg font-semibold">Acceso restringido</h1>
        <p className="text-sm text-muted-foreground">
          Solo el nutricionista administrador puede editar este contenido.
        </p>
        <Button variant="outline" asChild>
          <Link to="/dashboard">Volver al panel</Link>
        </Button>
      </div>
    );
  }

  const set = <K extends keyof NutriProfile>(key: K, value: NutriProfile[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const uploadMain = async (file: File) => {
    setUploadingMain(true);
    try {
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `main/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from(NUTRI_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (error) throw error;
      // Guardar de inmediato en la base para que la foto se vea sin depender de "Guardar cambios".
      const { error: dbError } = await supabase
        .from("nutri_profile")
        .update({ photo_path: path, updated_by: user?.id ?? null })
        .eq("id", "main");
      if (dbError) throw dbError;
      set("photo_path", path);
      qc.invalidateQueries({ queryKey: ["nutri-profile"] });
      qc.invalidateQueries({ queryKey: ["nutri-signed"] });
      toast.success("Fotografía actualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir la foto");
    } finally {
      setUploadingMain(false);
      if (mainRef.current) mainRef.current.value = "";
    }
  };

  const uploadGallery = async (files: FileList) => {
    setUploadingGallery(true);
    try {
      const base = (photos ?? []).length;
      let i = 0;
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `gallery/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage.from(NUTRI_BUCKET).upload(path, file);
        if (upErr) throw upErr;
        const { error } = await supabase.from("nutri_photos").insert({
          storage_path: path,
          section: gallerySection,
          sort_order: base + i,
          created_by: user?.id ?? null,
        });
        if (error) throw error;
        i += 1;
      }
      toast.success("Fotografías agregadas");
      qc.invalidateQueries({ queryKey: ["nutri-photos"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir fotografías");
    } finally {
      setUploadingGallery(false);
      if (galleryRef.current) galleryRef.current.value = "";
    }
  };

  const updatePhoto = async (
    id: string,
    patch: { caption?: string | null; section?: string; sort_order?: number },
  ) => {
    const { error } = await supabase.from("nutri_photos").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["nutri-photos"] });
  };

  const deletePhoto = async (id: string, path: string) => {
    const { error } = await supabase.from("nutri_photos").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.storage.from(NUTRI_BUCKET).remove([path]);
    toast.success("Fotografía eliminada");
    qc.invalidateQueries({ queryKey: ["nutri-photos"] });
  };

  const movePhoto = async (index: number, dir: -1 | 1) => {
    const list = photos ?? [];
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    await updatePhoto(list[index].id, { sort_order: j });
    await updatePhoto(list[j].id, { sort_order: index });
  };

  const moveSection = (i: number, dir: -1 | 1) => {
    if (!form) return;
    const order = form.section_order.length ? [...form.section_order] : SECTIONS.map((s) => s.id);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    set("section_order", order);
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("nutri_profile")
        .update({
          photo_path: form.photo_path,
          name: form.name,
          role_title: form.role_title,
          panel_title: form.panel_title,
          cta_label: form.cta_label,
          who_title: form.who_title,
          who_body: form.who_body,
          why_title: form.why_title,
          why_body: form.why_body,
          academic_title: form.academic_title,
          academic_items: form.academic_items.filter((i) => i.title.trim()),
          professional_title: form.professional_title,
          professional_items: form.professional_items.filter((i) => i.title.trim()),
          athletes_title: form.athletes_title,
          athletes_items: form.athletes_items.filter((i) => i.title.trim()),
          personal_title: form.personal_title,
          personal_body: form.personal_body,
          personal_items: form.personal_items.filter((i) => i.trim()),
          message_title: form.message_title,
          message_body: form.message_body,
          section_order: form.section_order.length ? form.section_order : SECTIONS.map((s) => s.id),
          is_visible: form.is_visible,
          updated_by: user?.id ?? null,
        })
        .eq("id", "main");
      if (error) throw error;
      toast.success("Cambios guardados. Los pacientes ya ven la nueva versión.");
      qc.invalidateQueries({ queryKey: ["nutri-profile"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <div className="min-h-[40vh]" aria-hidden />;

  const order = form.section_order.length ? form.section_order : SECTIONS.map((s) => s.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" /> Panel de administración
          </Link>
        </Button>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar cambios
        </Button>
      </div>

      <Card style={{ boxShadow: "var(--shadow-elegant)" }}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle>Conoce a tu Nutri</CardTitle>
              <CardDescription>
                Contenido global visible para todos los pacientes. Solo tú puedes editarlo.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <div className="text-sm font-medium">Panel visible para pacientes</div>
              <div className="text-xs text-muted-foreground">
                Desactívalo para ocultar el panel temporalmente.
              </div>
            </div>
            <Switch checked={form.is_visible} onCheckedChange={(v) => set("is_visible", v)} />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
            <div className="h-28 w-28 rounded-xl overflow-hidden border-2 border-primary/40 bg-muted/30 shrink-0">
              {form.photo_path && urlMap[form.photo_path] ? (
                <img
                  src={urlMap[form.photo_path]}
                  alt="Fotografía principal del nutricionista"
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="space-y-2">
              <input
                ref={mainRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadMain(e.target.files[0])}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingMain}
                onClick={() => mainRef.current?.click()}
              >
                {uploadingMain ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 mr-2" />
                )}
                {form.photo_path ? "Cambiar fotografía principal" : "Subir fotografía principal"}
              </Button>
              {form.photo_path && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => set("photo_path", null)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Quitar fotografía
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Título del panel</Label>
              <Input
                value={form.panel_title}
                onChange={(e) => set("panel_title", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Texto del botón</Label>
              <Input value={form.cta_label} onChange={(e) => set("cta_label", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Cargo / profesión</Label>
              <Input value={form.role_title} onChange={(e) => set("role_title", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Textos principales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Input
              value={form.who_title}
              onChange={(e) => set("who_title", e.target.value)}
              placeholder="Título"
            />
            <Textarea
              rows={8}
              value={form.who_body ?? ""}
              onChange={(e) => set("who_body", e.target.value)}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Input
              value={form.why_title}
              onChange={(e) => set("why_title", e.target.value)}
              placeholder="Título"
            />
            <Textarea
              rows={8}
              value={form.why_body ?? ""}
              onChange={(e) => set("why_body", e.target.value)}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Input
              value={form.message_title}
              onChange={(e) => set("message_title", e.target.value)}
              placeholder="Título"
            />
            <Textarea
              rows={8}
              value={form.message_body ?? ""}
              onChange={(e) => set("message_body", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logros académicos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={form.academic_title}
            onChange={(e) => set("academic_title", e.target.value)}
          />
          <ItemsEditor
            items={form.academic_items}
            onChange={(v) => set("academic_items", v)}
            labelTitle="Formación"
            labelSubtitle="Institución / estado"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logros profesionales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={form.professional_title}
            onChange={(e) => set("professional_title", e.target.value)}
          />
          <ItemsEditor
            items={form.professional_items}
            onChange={(v) => set("professional_items", v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deportistas y pacientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={form.athletes_title}
            onChange={(e) => set("athletes_title", e.target.value)}
          />
          <ItemsEditor items={form.athletes_items} onChange={(v) => set("athletes_items", v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logros personales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={form.personal_title}
            onChange={(e) => set("personal_title", e.target.value)}
          />
          <Textarea
            rows={4}
            value={form.personal_body ?? ""}
            onChange={(e) => set("personal_body", e.target.value)}
          />
          <ListEditor items={form.personal_items} onChange={(v) => set("personal_items", v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Orden de las secciones</CardTitle>
          <CardDescription>Define cómo se muestran las secciones al paciente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {order.map((id, i) => (
            <div
              key={id}
              className="flex items-center justify-between rounded-lg border border-border/60 p-2"
            >
              <span className="text-sm">{SECTIONS.find((s) => s.id === id)?.label ?? id}</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => moveSection(i, -1)}
                  aria-label="Subir sección"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => moveSection(i, 1)}
                  aria-label="Bajar sección"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fotografías</CardTitle>
          <CardDescription>Asigna cada fotografía a una sección y ordénalas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Select value={gallerySection} onValueChange={setGallerySection}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHOTO_SECTIONS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files?.length && uploadGallery(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingGallery}
              onClick={() => galleryRef.current?.click()}
            >
              {uploadingGallery ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Agregar fotografías
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(photos ?? []).map((p, i) => (
              <div key={p.id} className="rounded-lg border border-border/60 overflow-hidden">
                <img
                  src={urlMap[p.storage_path]}
                  alt={p.caption ?? "Fotografía del nutricionista"}
                  className="h-40 w-full object-cover"
                />
                <div className="p-2 space-y-2">
                  <Input
                    defaultValue={p.caption ?? ""}
                    placeholder="Descripción (opcional)"
                    onBlur={(e) =>
                      e.target.value !== (p.caption ?? "") &&
                      updatePhoto(p.id, { caption: e.target.value || null })
                    }
                  />
                  <Select
                    value={p.section}
                    onValueChange={(v) => updatePhoto(p.id, { section: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHOTO_SECTIONS.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => movePhoto(i, -1)}
                      aria-label="Mover antes"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => movePhoto(i, 1)}
                      aria-label="Mover después"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => deletePhoto(p.id, p.storage_path)}
                      aria-label="Eliminar fotografía"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
