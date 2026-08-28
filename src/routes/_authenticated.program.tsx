import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Share2,
  Upload,
  Loader2,
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
  Video,
  Plus,
  ExternalLink,
  Pencil,
  Save,
  X,
  Instagram,
  Music2,
  Youtube,
  Link2,
  Folder,
  Search,
  FlaskConical,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/program")({
  head: () => ({
    meta: [
      { title: "Biblioteca del programa — Lic. Diego Rivera" },
      {
        name: "description",
        content: "Guías, materiales educativos, artículos científicos y videos.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProgramPage,
});

type ResourceCategory = "guias" | "materiales_educativos" | "articulos_cientificos";
type ResourceType = "file" | "image" | "video" | "pdf" | "link";
type Platform = "tiktok" | "instagram" | "youtube" | "other";

type Resource = {
  id: string;
  category: ResourceCategory;
  title: string;
  description: string | null;
  storage_path: string | null;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  resource_type: ResourceType;
  external_url: string | null;
  material_category_id: string | null;
  uploaded_by: string;
  created_at: string;
};

type SocialCategory = { id: string; name: string; created_at: string };
type SocialVideo = {
  id: string;
  category_id: string;
  title: string;
  platform: Platform;
  url: string;
  created_at: string;
};
type MaterialCategory = { id: string; name: string; created_at: string };

const MAX_MB = 50;

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function guessResourceType(file: File): ResourceType {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "pdf";
  return "file";
}

function ProgramPage() {
  const { isAdmin, loading } = useAuth();
  const [search, setSearch] = useState("");

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 space-y-6">
      <div>
        <Link
          to="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mt-1">
          Biblioteca del programa
        </h1>
        <p className="text-sm text-muted-foreground">
          Guías, materiales educativos, artículos científicos y contenido de redes sociales.
          {isAdmin && " Como administrador puedes agregar y organizar el contenido."}
        </p>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título, tema, palabras clave, archivo, categoría..."
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="guias" className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto">
          <TabsTrigger value="guias" className="gap-2">
            <BookOpen className="h-4 w-4" /> Guías
          </TabsTrigger>
          <TabsTrigger value="materiales" className="gap-2">
            <GraduationCap className="h-4 w-4" /> Materiales
          </TabsTrigger>
          <TabsTrigger value="articulos" className="gap-2">
            <FlaskConical className="h-4 w-4" /> Artículos científicos
          </TabsTrigger>
          <TabsTrigger value="redes" className="gap-2">
            <Share2 className="h-4 w-4" /> Redes sociales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guias">
          <ResourceSection
            category="guias"
            title="Guías"
            description="Documentos guía preparados por el nutricionista."
            isAdmin={isAdmin}
            accept=".pdf,.doc,.docx,.ppt,.pptx"
            emptyLabel="Aún no hay guías disponibles."
            search={search}
          />
        </TabsContent>

        <TabsContent value="materiales">
          <MaterialsSection isAdmin={isAdmin} search={search} />
        </TabsContent>

        <TabsContent value="articulos">
          <ResourceSection
            category="articulos_cientificos"
            title="Artículos científicos"
            description="PDF, imágenes o enlaces (Google Drive) a artículos científicos. Solo el nutricionista puede subir o eliminar; los pacientes pueden descargarlos."
            isAdmin={isAdmin}
            accept="image/*,.pdf"
            emptyLabel="Aún no hay artículos científicos publicados."
            allowLink
            search={search}
          />
        </TabsContent>

        <TabsContent value="redes">
          <SocialSection isAdmin={isAdmin} search={search} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==========================================================
// Guías + Materiales educativos
// ==========================================================
function ResourceSection({
  category,
  title,
  description,
  isAdmin,
  accept,
  emptyLabel,
  allowLink,
  search,
}: {
  category: ResourceCategory;
  title: string;
  description: string;
  isAdmin: boolean;
  accept: string;
  emptyLabel: string;
  allowLink?: boolean;
  search: string;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [meta, setMeta] = useState({ title: "", description: "" });
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkForm, setLinkForm] = useState({ title: "", description: "", url: "" });
  const [savingLink, setSavingLink] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["program-resources", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_resources")
        .select("*")
        .eq("category", category)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Resource[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["program-resources", category] });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !data) return data ?? [];
    return data.filter((r) => {
      const hay = [
        r.title,
        r.description ?? "",
        r.original_filename ?? "",
        r.mime_type ?? "",
        r.external_url ?? "",
        r.resource_type,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data, search]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`El archivo no debe superar los ${MAX_MB} MB.`);
      return;
    }
    setPendingFile(f);
    setMeta({ title: f.name.replace(/\.[^.]+$/, ""), description: "" });
  };

  const upload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const safe = pendingFile.name.replace(/[^\w.\-]+/g, "_");
      const path = `${category}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from("program-resources")
        .upload(path, pendingFile, { contentType: pendingFile.type, upsert: false });
      if (upErr) throw upErr;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("program_resources").insert({
        category,
        title: meta.title.trim() || pendingFile.name,
        description: meta.description.trim() || null,
        storage_path: path,
        original_filename: pendingFile.name,
        mime_type: pendingFile.type || null,
        size_bytes: pendingFile.size,
        resource_type: guessResourceType(pendingFile),
        uploaded_by: user!.id,
      });
      if (insErr) {
        await supabase.storage.from("program-resources").remove([path]);
        throw insErr;
      }
      toast.success("Recurso subido");
      setPendingFile(null);
      setMeta({ title: "", description: "" });
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const saveLink = async () => {
    const url = linkForm.url.trim();
    const title = linkForm.title.trim();
    if (!url || !title) return;
    setSavingLink(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("program_resources").insert({
        category,
        title,
        description: linkForm.description.trim() || null,
        storage_path: null,
        original_filename: null,
        mime_type: null,
        size_bytes: null,
        resource_type: "link",
        external_url: url,
        uploaded_by: user!.id,
      });
      if (error) throw error;
      toast.success("Enlace agregado");
      setLinkForm({ title: "", description: "", url: "" });
      setLinkOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSavingLink(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-xl">{title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
            {isAdmin && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept={accept}
                  onChange={handleFile}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <Upload className="h-4 w-4 mr-2" /> Subir
                  </Button>
                  {allowLink && (
                    <Button variant="outline" onClick={() => setLinkOpen(true)}>
                      <Link2 className="h-4 w-4 mr-2" /> Agregar enlace
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Dialog to add title / description before uploading */}
      <Dialog open={!!pendingFile} onOpenChange={(o) => !o && !uploading && setPendingFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles del recurso</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Archivo: <span className="font-medium text-foreground">{pendingFile?.name}</span> (
              {formatSize(pendingFile?.size ?? null)})
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Título
              </label>
              <Input
                value={meta.title}
                onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Descripción (opcional)
              </label>
              <Textarea
                rows={3}
                value={meta.description}
                onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingFile(null)} disabled={uploading}>
              Cancelar
            </Button>
            <Button onClick={upload} disabled={uploading || !meta.title.trim()}>
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Subir recurso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog to add link-only resource (e.g. Google Drive) */}
      <Dialog open={linkOpen} onOpenChange={(o) => !o && !savingLink && setLinkOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar enlace externo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Título
              </label>
              <Input
                value={linkForm.title}
                onChange={(e) => setLinkForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Enlace
              </label>
              <Input
                value={linkForm.url}
                onChange={(e) => setLinkForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://drive.google.com/..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Descripción (opcional)
              </label>
              <Textarea
                rows={3}
                value={linkForm.description}
                onChange={(e) => setLinkForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLinkOpen(false)} disabled={savingLink}>
              Cancelar
            </Button>
            <Button
              onClick={saveLink}
              disabled={savingLink || !linkForm.title.trim() || !linkForm.url.trim()}
            >
              {savingLink ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar enlace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((r) => (
            <ResourceCard key={r.id} resource={r} isAdmin={isAdmin} onChanged={refresh} />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No hay resultados para "{search}".
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div className="text-lg font-semibold text-foreground">{emptyLabel}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResourceCard({
  resource,
  isAdmin,
  onChanged,
}: {
  resource: Resource;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [editing, setEditing] = useState(false);
  const [meta, setMeta] = useState({
    title: resource.title,
    description: resource.description ?? "",
  });
  const [saving, setSaving] = useState(false);

  const Icon =
    resource.resource_type === "image"
      ? ImageIcon
      : resource.resource_type === "video"
        ? Video
        : resource.resource_type === "link"
          ? Link2
          : FileText;

  const isLink = resource.resource_type === "link";

  const openPreview = async () => {
    if (isLink) {
      if (resource.external_url)
        window.open(resource.external_url, "_blank", "noopener,noreferrer");
      return;
    }
    if (!resource.storage_path) return;
    setLoadingPreview(true);
    try {
      const { data, error } = await supabase.storage
        .from("program-resources")
        .createSignedUrl(resource.storage_path, 3600);
      if (error || !data?.signedUrl) throw error ?? new Error("Sin URL");
      setPreviewUrl(data.signedUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo abrir");
    } finally {
      setLoadingPreview(false);
    }
  };

  const download = async () => {
    if (isLink) {
      if (resource.external_url)
        window.open(resource.external_url, "_blank", "noopener,noreferrer");
      return;
    }
    if (!resource.storage_path) return;
    const { data, error } = await supabase.storage
      .from("program-resources")
      .createSignedUrl(resource.storage_path, 300, {
        download: resource.original_filename ?? true,
      });
    if (error || !data?.signedUrl) {
      toast.error("No se pudo generar el enlace");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const remove = async () => {
    try {
      if (resource.storage_path) {
        await supabase.storage.from("program-resources").remove([resource.storage_path]);
      }
      const { error } = await supabase.from("program_resources").delete().eq("id", resource.id);
      if (error) throw error;
      toast.success("Recurso eliminado");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const saveMeta = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("program_resources")
        .update({ title: meta.title.trim(), description: meta.description.trim() || null })
        .eq("id", resource.id);
      if (error) throw error;
      toast.success("Actualizado");
      setEditing(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardContent className="p-5 flex flex-col gap-3 h-full">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              {editing ? (
                <div className="space-y-2">
                  <Input
                    value={meta.title}
                    onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
                  />
                  <Textarea
                    rows={2}
                    value={meta.description}
                    onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
                  />
                </div>
              ) : (
                <>
                  <div className="font-medium text-foreground truncate">{resource.title}</div>
                  {resource.description && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {resource.description}
                    </p>
                  )}
                  {isLink ? (
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {resource.external_url}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground mt-1">
                      {resource.original_filename} · {formatSize(resource.size_bytes)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={openPreview} disabled={loadingPreview}>
              {loadingPreview ? (
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-3 w-3 mr-2" />
              )}
              Ver
            </Button>
            <Button size="sm" variant="outline" onClick={download}>
              <Download className="h-3 w-3 mr-2" /> Descargar
            </Button>
            {isAdmin && !editing && (
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                <Pencil className="h-3 w-3 mr-2" /> Editar
              </Button>
            )}
            {isAdmin && editing && (
              <>
                <Button size="sm" onClick={saveMeta} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3 mr-2" />
                  )}
                  Guardar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setMeta({ title: resource.title, description: resource.description ?? "" });
                  }}
                  disabled={saving}
                >
                  <X className="h-3 w-3 mr-2" /> Cancelar
                </Button>
              </>
            )}
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="ml-auto text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar recurso</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={remove}>Eliminar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="truncate">{resource.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-black/50 overflow-hidden">
            {previewUrl && resource.resource_type === "image" && (
              <img src={previewUrl} alt={resource.title} className="w-full h-full object-contain" />
            )}
            {previewUrl && resource.resource_type === "video" && (
              <video src={previewUrl} controls className="w-full h-full" />
            )}
            {previewUrl &&
              (resource.resource_type === "pdf" || resource.resource_type === "file") && (
                <iframe
                  src={previewUrl}
                  className="w-full h-full bg-white"
                  title={resource.title}
                />
              )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==========================================================
// Redes sociales
// ==========================================================
function detectPlatform(url: string): Platform {
  const u = url.toLowerCase();
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  return "other";
}

function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  if (platform === "tiktok") return <Music2 className={className} />;
  if (platform === "instagram") return <Instagram className={className} />;
  if (platform === "youtube") return <Youtube className={className} />;
  return <Link2 className={className} />;
}

function platformLabel(p: Platform) {
  return p === "tiktok"
    ? "TikTok"
    : p === "instagram"
      ? "Instagram"
      : p === "youtube"
        ? "YouTube"
        : "Enlace";
}

function SocialSection({ isAdmin, search }: { isAdmin: boolean; search: string }) {
  const qc = useQueryClient();
  const [newCategory, setNewCategory] = useState("");
  const [savingCat, setSavingCat] = useState(false);
  const [videoDialogCat, setVideoDialogCat] = useState<SocialCategory | null>(null);
  const [editVideo, setEditVideo] = useState<SocialVideo | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["social-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_video_categories")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SocialCategory[];
    },
  });

  const { data: videos } = useQuery({
    queryKey: ["social-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_videos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SocialVideo[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["social-categories"] });
    qc.invalidateQueries({ queryKey: ["social-videos"] });
  };

  const q = search.trim().toLowerCase();
  const matches = (v: SocialVideo, catName: string) =>
    !q ||
    v.title.toLowerCase().includes(q) ||
    v.url.toLowerCase().includes(q) ||
    v.platform.toLowerCase().includes(q) ||
    catName.toLowerCase().includes(q);

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    setSavingCat(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("social_video_categories")
        .insert({ name, created_by: user!.id });
      if (error) throw error;
      toast.success("Categoría creada");
      setNewCategory("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear categoría");
    } finally {
      setSavingCat(false);
    }
  };

  const removeCategory = async (id: string) => {
    try {
      const { error } = await supabase.from("social_video_categories").delete().eq("id", id);
      if (error) throw error;
      toast.success("Categoría eliminada");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const renameCategory = async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const { error } = await supabase
        .from("social_video_categories")
        .update({ name: trimmed })
        .eq("id", id);
      if (error) throw error;
      toast.success("Categoría actualizada");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al renombrar");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-xl">Redes sociales</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Videos organizados por categorías. Enlaces de TikTok, Instagram, YouTube u otras
                plataformas.
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-2 pt-3">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nueva categoría (ej. Suplementación)"
                className="max-w-xs"
                disabled={savingCat}
              />
              <Button onClick={addCategory} disabled={savingCat || !newCategory.trim()}>
                {savingCat ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Crear categoría
              </Button>
            </div>
          )}
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="space-y-4">
          {categories.map((cat) => {
            const allCatVideos = (videos ?? []).filter((v) => v.category_id === cat.id);
            const catVideos = allCatVideos.filter((v) => matches(v, cat.name));
            const categoryMatchesQuery = !q || cat.name.toLowerCase().includes(q);
            if (q && catVideos.length === 0 && !categoryMatchesQuery) return null;
            return (
              <Card key={cat.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                        <Folder className="h-5 w-5" />
                      </div>
                      <CategoryTitle
                        cat={cat}
                        count={catVideos.length}
                        isAdmin={isAdmin}
                        onRename={(name) => renameCategory(cat.id, name)}
                      />
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setVideoDialogCat(cat)}>
                          <Plus className="h-3 w-3 mr-2" /> Agregar video
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar categoría</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se eliminarán también todos los videos ({catVideos.length})
                                asociados a esta categoría.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeCategory(cat.id)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {catVideos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Sin videos en esta categoría todavía.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {catVideos.map((v) => (
                        <VideoCard
                          key={v.id}
                          video={v}
                          isAdmin={isAdmin}
                          onChanged={refresh}
                          onEdit={() => setEditVideo(v)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Share2 className="h-6 w-6 text-primary" />
            </div>
            <div className="text-lg font-semibold text-foreground">Aún no hay categorías</div>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin
                ? "Crea la primera categoría para agrupar los videos."
                : "El nutricionista aún no ha publicado videos."}
            </p>
          </CardContent>
        </Card>
      )}

      <AddVideoDialog
        category={videoDialogCat}
        onClose={() => setVideoDialogCat(null)}
        onSaved={refresh}
      />

      <EditVideoDialog video={editVideo} onClose={() => setEditVideo(null)} onSaved={refresh} />
    </div>
  );
}

function CategoryTitle({
  cat,
  count,
  isAdmin,
  onRename,
}: {
  cat: SocialCategory;
  count: number;
  isAdmin: boolean;
  onRename: (name: string) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || name.trim() === cat.name) {
      setEditing(false);
      setName(cat.name);
      return;
    }
    setSaving(true);
    try {
      await onRename(name);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing && isAdmin) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 max-w-[220px]"
          autoFocus
        />
        <Button size="icon" variant="ghost" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            setEditing(false);
            setName(cat.name);
          }}
          disabled={saving}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <CardTitle className="text-lg">{cat.name}</CardTitle>
        {isAdmin && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {count} video{count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function EditVideoDialog({
  video,
  onClose,
  onSaved,
}: {
  video: SocialVideo | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ title: "", url: "", platform: "other" as Platform });
  const [saving, setSaving] = useState(false);

  const initialize = () => {
    if (video) setForm({ title: video.title, url: video.url, platform: video.platform });
  };

  const submit = async () => {
    if (!video) return;
    const url = form.url.trim();
    const title = form.title.trim();
    if (!url || !title) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("social_videos")
        .update({ title, url, platform: form.platform })
        .eq("id", video.id);
      if (error) throw error;
      toast.success("Video actualizado");
      onClose();
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!video}
      onOpenChange={(o) => {
        if (o) initialize();
        else onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar video</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Título / Tema
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Enlace del video
            </label>
            <Input
              value={form.url}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  url: e.target.value,
                  platform: detectPlatform(e.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Plataforma
            </label>
            <Select
              value={form.platform}
              onValueChange={(v) => setForm((f) => ({ ...f, platform: v as Platform }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || !form.title.trim() || !form.url.trim()}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddVideoDialog({
  category,
  onClose,
  onSaved,
}: {
  category: SocialCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ title: "", url: "", platform: "" as Platform | "" });
  const [saving, setSaving] = useState(false);

  const reset = () => setForm({ title: "", url: "", platform: "" });

  const submit = async () => {
    if (!category) return;
    const url = form.url.trim();
    const title = form.title.trim();
    if (!url || !title) return;
    const platform: Platform = form.platform || detectPlatform(url);
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("social_videos").insert({
        category_id: category.id,
        title,
        url,
        platform,
        created_by: user!.id,
      });
      if (error) throw error;
      toast.success("Video agregado");
      reset();
      onClose();
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={!!category}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar video — {category?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Título / Tema
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ej. Cómo calcular tus macros"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Enlace del video
            </label>
            <Input
              value={form.url}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  url: e.target.value,
                  platform: f.platform || (detectPlatform(e.target.value) as Platform),
                }))
              }
              placeholder="https://www.tiktok.com/... o https://www.instagram.com/..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Plataforma
            </label>
            <Select
              value={form.platform || detectPlatform(form.url)}
              onValueChange={(v) => setForm((f) => ({ ...f, platform: v as Platform }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || !form.title.trim() || !form.url.trim()}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VideoCard({
  video,
  isAdmin,
  onChanged,
  onEdit,
}: {
  video: SocialVideo;
  isAdmin: boolean;
  onChanged: () => void;
  onEdit: () => void;
}) {
  const remove = async () => {
    try {
      const { error } = await supabase.from("social_videos").delete().eq("id", video.id);
      if (error) throw error;
      toast.success("Video eliminado");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const openVideo = () => {
    // Si la app corre embebida en un iframe, abrir desde la ventana superior
    // evita los bloqueadores de popups; si falla, se navega en la misma pestaña.
    try {
      const top = window.top ?? window;
      const win = top.open(video.url, "_blank", "noopener,noreferrer");
      if (!win) {
        // Popup blocked — navigate the top frame instead
        top.location.href = video.url;
      }
    } catch {
      window.location.href = video.url;
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(video.url);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <PlatformIcon platform={video.platform} className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-foreground truncate">{video.title}</div>
          <Badge variant="outline" className="mt-1 text-[10px] uppercase tracking-wider">
            {platformLabel(video.platform)}
          </Badge>
        </div>
      </div>
      <div className="text-xs text-muted-foreground truncate">{video.url}</div>
      <div className="flex items-center flex-wrap gap-2 mt-auto">
        <Button size="sm" variant="outline" onClick={openVideo}>
          <ExternalLink className="h-3 w-3 mr-2" /> Ver video
        </Button>
        <Button size="sm" variant="ghost" onClick={copyLink} title="Copiar enlace">
          <Link2 className="h-3 w-3 mr-2" /> Copiar
        </Button>
        {isAdmin && (
          <Button
            size="icon"
            variant="ghost"
            className="ml-auto text-muted-foreground"
            onClick={onEdit}
            title="Editar video"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminar video</AlertDialogTitle>
                <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={remove}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

// ==========================================================
// Materiales educativos (con sub-categorías)
// ==========================================================
function MaterialsSection({ isAdmin, search }: { isAdmin: boolean; search: string }) {
  const qc = useQueryClient();
  const [newCategory, setNewCategory] = useState("");
  const [savingCat, setSavingCat] = useState(false);
  const [uploadCat, setUploadCat] = useState<MaterialCategory | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [meta, setMeta] = useState({ title: "", description: "" });
  const [uploading, setUploading] = useState(false);

  const { data: categories, isLoading } = useQuery({
    queryKey: ["material-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_categories")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MaterialCategory[];
    },
  });

  const { data: resources } = useQuery({
    queryKey: ["program-resources", "materiales_educativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_resources")
        .select("*")
        .eq("category", "materiales_educativos")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Resource[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["material-categories"] });
    qc.invalidateQueries({ queryKey: ["program-resources", "materiales_educativos"] });
  };

  const q = search.trim().toLowerCase();
  const matches = (r: Resource, catName: string) => {
    if (!q) return true;
    return [r.title, r.description ?? "", r.original_filename ?? "", r.external_url ?? "", catName]
      .join(" ")
      .toLowerCase()
      .includes(q);
  };

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    setSavingCat(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("material_categories")
        .insert({ name, created_by: user!.id });
      if (error) throw error;
      toast.success("Categoría creada");
      setNewCategory("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setSavingCat(false);
    }
  };

  const renameCategory = async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const { error } = await supabase
        .from("material_categories")
        .update({ name: trimmed })
        .eq("id", id);
      if (error) throw error;
      toast.success("Categoría actualizada");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al renombrar");
    }
  };

  const removeCategory = async (id: string) => {
    try {
      const { error } = await supabase.from("material_categories").delete().eq("id", id);
      if (error) throw error;
      toast.success("Categoría eliminada");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`El archivo no debe superar los ${MAX_MB} MB.`);
      return;
    }
    setPendingFile(f);
    setMeta({ title: f.name.replace(/\.[^.]+$/, ""), description: "" });
  };

  const upload = async () => {
    if (!pendingFile || !uploadCat) return;
    setUploading(true);
    try {
      const safe = pendingFile.name.replace(/[^\w.\-]+/g, "_");
      const path = `materiales_educativos/${uploadCat.id}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from("program-resources")
        .upload(path, pendingFile, { contentType: pendingFile.type, upsert: false });
      if (upErr) throw upErr;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("program_resources").insert({
        category: "materiales_educativos",
        material_category_id: uploadCat.id,
        title: meta.title.trim() || pendingFile.name,
        description: meta.description.trim() || null,
        storage_path: path,
        original_filename: pendingFile.name,
        mime_type: pendingFile.type || null,
        size_bytes: pendingFile.size,
        resource_type: guessResourceType(pendingFile),
        uploaded_by: user!.id,
      });
      if (insErr) {
        await supabase.storage.from("program-resources").remove([path]);
        throw insErr;
      }
      toast.success("Recurso subido");
      setPendingFile(null);
      setUploadCat(null);
      setMeta({ title: "", description: "" });
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const uncategorized = (resources ?? []).filter((r) => !r.material_category_id);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-xl">Materiales educativos</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Organiza imágenes y PDFs por categorías (nutrición, entrenamiento, suplementación,
              etc.).
            </p>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-2 pt-3">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nueva categoría (ej. Suplementación)"
                className="max-w-xs"
                disabled={savingCat}
              />
              <Button onClick={addCategory} disabled={savingCat || !newCategory.trim()}>
                {savingCat ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Crear categoría
              </Button>
            </div>
          )}
        </CardHeader>
      </Card>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"
        onChange={handleFile}
      />

      {/* Upload metadata dialog */}
      <Dialog open={!!pendingFile} onOpenChange={(o) => !o && !uploading && setPendingFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir a {uploadCat?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Archivo: <span className="font-medium text-foreground">{pendingFile?.name}</span> (
              {formatSize(pendingFile?.size ?? null)})
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Título
              </label>
              <Input
                value={meta.title}
                onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Descripción (opcional)
              </label>
              <Textarea
                rows={3}
                value={meta.description}
                onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingFile(null)} disabled={uploading}>
              Cancelar
            </Button>
            <Button onClick={upload} disabled={uploading || !meta.title.trim()}>
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Subir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (categories && categories.length > 0) || uncategorized.length > 0 ? (
        <div className="space-y-4">
          {(categories ?? []).map((cat) => {
            const catRes = (resources ?? []).filter((r) => r.material_category_id === cat.id);
            const filtered = catRes.filter((r) => matches(r, cat.name));
            const categoryMatchesQuery = !q || cat.name.toLowerCase().includes(q);
            if (q && filtered.length === 0 && !categoryMatchesQuery) return null;
            return (
              <Card key={cat.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                        <Folder className="h-5 w-5" />
                      </div>
                      <MaterialCategoryTitle
                        cat={cat}
                        count={catRes.length}
                        isAdmin={isAdmin}
                        onRename={(name) => renameCategory(cat.id, name)}
                      />
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setUploadCat(cat);
                            fileRef.current?.click();
                          }}
                        >
                          <Upload className="h-3 w-3 mr-2" /> Subir archivo
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminar categoría</AlertDialogTitle>
                              <AlertDialogDescription>
                                Los archivos ({catRes.length}) quedarán sin categoría, no se
                                borrarán.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeCategory(cat.id)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {q
                        ? "Sin coincidencias en esta categoría."
                        : "Sin archivos en esta categoría todavía."}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filtered.map((r) => (
                        <ResourceCard
                          key={r.id}
                          resource={r}
                          isAdmin={isAdmin}
                          onChanged={refresh}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {uncategorized.length > 0 &&
            (() => {
              const filtered = uncategorized.filter((r) => matches(r, "Sin categoría"));
              if (q && filtered.length === 0) return null;
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sin categoría</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Archivos antiguos aún sin agrupar.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filtered.map((r) => (
                        <ResourceCard
                          key={r.id}
                          resource={r}
                          isAdmin={isAdmin}
                          onChanged={refresh}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
        </div>
      ) : (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div className="text-lg font-semibold text-foreground">Aún no hay categorías</div>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin
                ? "Crea la primera categoría para agrupar los materiales."
                : "El nutricionista aún no ha publicado materiales."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MaterialCategoryTitle({
  cat,
  count,
  isAdmin,
  onRename,
}: {
  cat: MaterialCategory;
  count: number;
  isAdmin: boolean;
  onRename: (name: string) => Promise<void> | void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || name.trim() === cat.name) {
      setEditing(false);
      setName(cat.name);
      return;
    }
    setSaving(true);
    try {
      await onRename(name);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing && isAdmin) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 max-w-[220px]"
          autoFocus
        />
        <Button size="icon" variant="ghost" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            setEditing(false);
            setName(cat.name);
          }}
          disabled={saving}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <CardTitle className="text-lg">{cat.name}</CardTitle>
        {isAdmin && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {count} archivo{count === 1 ? "" : "s"}
      </p>
    </div>
  );
}
