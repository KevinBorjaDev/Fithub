import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Upload,
  ArrowLeft,
  Loader2,
  Trash2,
  Save,
  Pencil,
  X,
  Download,
  FlaskConical,
  Activity,
  ClipboardList,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Documentos — Lic. Diego Rivera" },
      {
        name: "description",
        content: "Sube exámenes, bioimpedancia, ficha nutricional y tratamiento médico.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    patient: typeof s.patient === "string" ? s.patient : undefined,
  }),
  component: DocumentsPage,
});

type DocCategory =
  | "examenes_laboratorio"
  | "examen_bioimpedancia"
  | "ficha_nutricional"
  | "tratamiento_medico_actual";

const CATEGORIES: {
  key: DocCategory;
  title: string;
  desc: string;
  icon: typeof FlaskConical;
}[] = [
  {
    key: "examenes_laboratorio",
    title: "Exámenes de laboratorio",
    desc: "Análisis clínicos y de sangre.",
    icon: FlaskConical,
  },
  {
    key: "examen_bioimpedancia",
    title: "Examen de bioimpedancia",
    desc: "Composición corporal.",
    icon: Activity,
  },
  {
    key: "ficha_nutricional",
    title: "Ficha nutricional",
    desc: "Registro alimentario y encuestas.",
    icon: ClipboardList,
  },
  {
    key: "tratamiento_medico_actual",
    title: "Tratamiento médico actual",
    desc: "Medicación y diagnósticos vigentes.",
    icon: Stethoscope,
  },
];

const ALLOWED_EXT = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "zip"];
const MAX_MB = 25;

type DocRow = {
  id: string;
  user_id: string;
  category: DocCategory;
  storage_path: string;
  original_filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  document_date: string;
  patient_comment: string | null;
  nutritionist_comment: string | null;
  created_at: string;
};

function formatDate(d: string) {
  const parsed = new Date(d + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });
}

function todayInLima(): string {
  const now = new Date();
  const lima = new Date(now.toLocaleString("en-US", { timeZone: "America/Lima" }));
  const y = lima.getFullYear();
  const m = String(lima.getMonth() + 1).padStart(2, "0");
  const d = String(lima.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentsPage() {
  const { user, isAdmin, loading } = useAuth();
  const { patient: patientParam } = Route.useSearch();
  const targetUserId = isAdmin && patientParam ? patientParam : (user?.id ?? null);
  const isOwner = !patientParam || patientParam === user?.id;
  const [openCategory, setOpenCategory] = useState<DocCategory | null>(null);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link
            to="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> Volver al panel
          </Link>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mt-1">Documentos</h1>
          <p className="text-sm text-muted-foreground">
            Sube tus documentos por categoría. Formatos: PDF, Word, PowerPoint, Excel, ZIP (máx.{" "}
            {MAX_MB} MB).
            {isAdmin && " Como administrador puedes editar los comentarios del nutricionista."}
          </p>
        </div>
        {openCategory && (
          <Button variant="outline" onClick={() => setOpenCategory(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver a categorías
          </Button>
        )}
      </div>

      {isAdmin && patientParam && patientParam !== user?.id && (
        <div className="rounded-md border border-primary/40 bg-primary/5 text-sm px-4 py-2">
          Estás viendo los documentos de otro paciente como nutricionista.
        </div>
      )}
      {!openCategory ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CATEGORIES.map((c) => (
            <CategoryCard
              key={c.key}
              category={c}
              userId={targetUserId!}
              onOpen={() => setOpenCategory(c.key)}
            />
          ))}
        </div>
      ) : (
        <CategoryDetail
          category={CATEGORIES.find((c) => c.key === openCategory)!}
          userId={targetUserId!}
          isAdmin={isAdmin}
          isOwner={isOwner}
        />
      )}
    </div>
  );
}

function CategoryCard({
  category,
  userId,
  onOpen,
}: {
  category: (typeof CATEGORIES)[number];
  userId: string;
  onOpen: () => void;
}) {
  const { data: count } = useQuery({
    queryKey: ["doc-count", userId, category.key],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("category", category.key);
      if (error) throw error;
      return count ?? 0;
    },
  });
  const Icon = category.icon;
  return (
    <button
      onClick={onOpen}
      className="text-left rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/60 hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-lg font-semibold text-foreground">{category.title}</div>
          <p className="text-sm text-muted-foreground mt-1">{category.desc}</p>
          <Badge variant="outline" className="mt-3">
            {count ?? 0} documento{count === 1 ? "" : "s"}
          </Badge>
        </div>
      </div>
    </button>
  );
}

function CategoryDetail({
  category,
  userId,
  isAdmin,
  isOwner,
}: {
  category: (typeof CATEGORIES)[number];
  userId: string;
  isAdmin: boolean;
  isOwner: boolean;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: docs, isLoading } = useQuery({
    queryKey: ["documents", userId, category.key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", userId)
        .eq("category", category.key)
        .order("document_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocRow[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["documents", userId, category.key] });
    qc.invalidateQueries({ queryKey: ["doc-count", userId, category.key] });
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      toast.error(`Formato no permitido. Usa: ${ALLOWED_EXT.join(", ")}.`);
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`El archivo no debe superar los ${MAX_MB} MB.`);
      return;
    }
    setUploading(true);
    try {
      const path = `${userId}/${category.key}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("patient-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("documents").insert({
        user_id: userId,
        category: category.key,
        storage_path: path,
        original_filename: file.name,
        mime_type: file.type || null,
        size_bytes: file.size,
        document_date: todayInLima(),
      });
      if (insErr) {
        await supabase.storage.from("patient-documents").remove([path]);
        throw insErr;
      }
      toast.success("Documento subido");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const Icon = category.icon;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">{category.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{category.desc}</p>
              </div>
            </div>
            {(isOwner || isAdmin) && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                  onChange={onUpload}
                />
                <Button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Subir documento
                </Button>
              </>
            )}
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : docs && docs.length > 0 ? (
        <div className="space-y-4">
          {docs.map((d) => (
            <DocumentItem
              key={d.id}
              doc={d}
              isAdmin={isAdmin}
              isOwner={isOwner}
              onChanged={refresh}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div className="text-lg font-semibold text-foreground">Aún no hay documentos</div>
            <p className="text-sm text-muted-foreground mt-1">
              Sube tu primer documento para esta categoría.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DocumentItem({
  doc,
  isAdmin,
  isOwner,
  onChanged,
}: {
  doc: DocRow;
  isAdmin: boolean;
  isOwner: boolean;
  onChanged: () => void;
}) {
  const canEditDate = isOwner || isAdmin;
  const [editingDate, setEditingDate] = useState(false);
  const [newDate, setNewDate] = useState(doc.document_date);
  const [savingDate, setSavingDate] = useState(false);
  const [patientComment, setPatientComment] = useState(doc.patient_comment ?? "");
  const [nutriComment, setNutriComment] = useState(doc.nutritionist_comment ?? "");
  const [savingPatient, setSavingPatient] = useState(false);
  const [savingNutri, setSavingNutri] = useState(false);

  useEffect(() => {
    setNewDate(doc.document_date);
    setEditingDate(false);
  }, [doc.id, doc.document_date]);

  useEffect(() => {
    setPatientComment(doc.patient_comment ?? "");
    setNutriComment(doc.nutritionist_comment ?? "");
  }, [doc.id, doc.patient_comment, doc.nutritionist_comment]);

  const saveDate = async () => {
    if (!newDate || newDate === doc.document_date) {
      setEditingDate(false);
      return;
    }
    setSavingDate(true);
    try {
      const { error } = await supabase
        .from("documents")
        .update({ document_date: newDate })
        .eq("id", doc.id);
      if (error) throw error;
      toast.success("Fecha actualizada");
      setEditingDate(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar la fecha");
    } finally {
      setSavingDate(false);
    }
  };

  const savePatient = async () => {
    setSavingPatient(true);
    try {
      const { error } = await supabase
        .from("documents")
        .update({ patient_comment: patientComment })
        .eq("id", doc.id);
      if (error) throw error;
      toast.success("Comentario guardado");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSavingPatient(false);
    }
  };

  const saveNutri = async () => {
    setSavingNutri(true);
    try {
      const { error } = await supabase
        .from("documents")
        .update({ nutritionist_comment: nutriComment })
        .eq("id", doc.id);
      if (error) throw error;
      toast.success("Comentario guardado");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSavingNutri(false);
    }
  };

  const download = async () => {
    const { data, error } = await supabase.storage
      .from("patient-documents")
      .createSignedUrl(doc.storage_path, 300, { download: doc.original_filename });
    if (error || !data?.signedUrl) {
      toast.error("No se pudo generar el enlace");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const remove = async () => {
    try {
      await supabase.storage.from("patient-documents").remove([doc.storage_path]);
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
      toast.success("Documento eliminado");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-foreground truncate">{doc.original_filename}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {formatSize(doc.size_bytes)}
              </div>
              <div className="mt-2">
                {editingDate ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-auto h-8"
                      disabled={savingDate}
                    />
                    <Button size="sm" onClick={saveDate} disabled={savingDate}>
                      {savingDate ? (
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
                        setNewDate(doc.document_date);
                        setEditingDate(false);
                      }}
                      disabled={savingDate}
                    >
                      <X className="h-3 w-3 mr-2" /> Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{formatDate(doc.document_date)}</Badge>
                    {canEditDate && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => setEditingDate(true)}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Cambiar fecha
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={download}>
              <Download className="h-3 w-3 mr-2" /> Descargar
            </Button>
            {(isOwner || isAdmin) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar documento</AlertDialogTitle>
                    <AlertDialogDescription>
                      El archivo y sus comentarios se eliminarán. Esta acción no se puede deshacer.
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Comentario del paciente
            </label>
            <Textarea
              value={patientComment}
              onChange={(e) => setPatientComment(e.target.value)}
              placeholder={isOwner ? "Escribe aquí…" : "Sin comentario del paciente."}
              disabled={!isOwner || savingPatient}
              rows={3}
            />
            {isOwner && (
              <Button
                size="sm"
                variant="outline"
                onClick={savePatient}
                disabled={savingPatient || patientComment === (doc.patient_comment ?? "")}
              >
                {savingPatient ? (
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                ) : (
                  <Save className="h-3 w-3 mr-2" />
                )}
                Guardar comentario
              </Button>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Comentario del nutricionista
            </label>
            <Textarea
              value={nutriComment}
              onChange={(e) => setNutriComment(e.target.value)}
              placeholder={isAdmin ? "Escribe aquí…" : "Sin comentario del nutricionista."}
              disabled={!isAdmin || savingNutri}
              rows={3}
            />
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                onClick={saveNutri}
                disabled={savingNutri || nutriComment === (doc.nutritionist_comment ?? "")}
              >
                {savingNutri ? (
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                ) : (
                  <Save className="h-3 w-3 mr-2" />
                )}
                Guardar comentario
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
