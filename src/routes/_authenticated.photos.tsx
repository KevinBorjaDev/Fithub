import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Plus,
  ArrowLeft,
  Loader2,
  Trash2,
  Save,
  Upload,
  CalendarDays,
  Pencil,
  X,
  ImageIcon,
  FileText,
  Download,
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

export const Route = createFileRoute("/_authenticated/photos")({
  head: () => ({
    meta: [
      { title: "Fotos — Lic. Diego Rivera" },
      { name: "description", content: "Registro fotográfico de progreso por fecha." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    patient: typeof s.patient === "string" ? s.patient : undefined,
  }),
  component: PhotosPage,
});

const ANGLES: {
  key: "frontal" | "posterior" | "perfil_izquierdo" | "perfil_derecho";
  label: string;
}[] = [
  { key: "frontal", label: "Frontal" },
  { key: "posterior", label: "Posterior" },
  { key: "perfil_izquierdo", label: "Perfil Izquierdo" },
  { key: "perfil_derecho", label: "Perfil Derecho" },
];

type Angle = (typeof ANGLES)[number]["key"];

type PhotoSession = {
  id: string;
  user_id: string;
  session_date: string;
  created_at: string;
};

type Photo = {
  id: string;
  session_id: string;
  user_id: string;
  angle: Angle;
  storage_path: string;
  patient_comment: string | null;
  nutritionist_comment: string | null;
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

function PhotosPage() {
  const { user, isAdmin, loading } = useAuth();
  const { patient: patientParam } = Route.useSearch();
  const qc = useQueryClient();
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);

  const targetUserId = isAdmin && patientParam ? patientParam : (user?.id ?? null);
  const viewingOther = isAdmin && !!patientParam && patientParam !== user?.id;

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["photo-sessions", targetUserId],
    enabled: !!targetUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photo_sessions")
        .select("*")
        .eq("user_id", targetUserId!)
        .order("session_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PhotoSession[];
    },
  });

  const createSession = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sin sesión");
      if (viewingOther) throw new Error("Solo el paciente puede crear sus carpetas.");
      const date = todayInLima();
      const { data, error } = await supabase
        .from("photo_sessions")
        .insert({ user_id: targetUserId!, session_date: date })
        .select()
        .single();
      if (error) {
        if (error.code === "23505") {
          throw new Error("Ya existe una carpeta con la fecha de hoy.");
        }
        throw error;
      }
      return data as PhotoSession;
    },
    onSuccess: (s) => {
      qc.setQueryData<PhotoSession[]>(["photo-sessions", targetUserId], (old) => [
        s,
        ...(old ?? []),
      ]);
      qc.invalidateQueries({ queryKey: ["photo-sessions", targetUserId] });
      setOpenSessionId(s.id);
      toast.success("Carpeta creada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data: photos } = await supabase
        .from("photos")
        .select("storage_path")
        .eq("session_id", sessionId);
      if (photos && photos.length > 0) {
        await supabase.storage.from("patient-photos").remove(photos.map((p) => p.storage_path));
      }
      const { error } = await supabase.from("photo_sessions").delete().eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["photo-sessions", targetUserId] });
      setOpenSessionId(null);
      toast.success("Carpeta eliminada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openSession = useMemo(
    () => sessions?.find((s) => s.id === openSessionId) ?? null,
    [sessions, openSessionId],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 space-y-6">
      <ReferencePanel isAdmin={isAdmin} />
      {viewingOther && (
        <div className="rounded-md border border-primary/40 bg-primary/5 text-sm px-4 py-2">
          Viendo fotos de otro paciente como nutricionista. No podrás crear carpetas nuevas.
        </div>
      )}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Link
            to="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> Volver al panel
          </Link>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mt-1">
            Fotos de progreso
          </h1>
          <p className="text-sm text-muted-foreground">
            Crea una carpeta con la fecha de hoy y sube tus 4 fotos.
            {isAdmin &&
              " Como administrador también puedes editar los comentarios del nutricionista."}
          </p>
        </div>
        {!openSession && !viewingOther && (
          <Button
            onClick={() => createSession.mutate()}
            disabled={createSession.isPending}
            style={{ background: "var(--gradient-primary)" }}
          >
            {createSession.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Nueva carpeta (hoy)
          </Button>
        )}
        {openSession && (
          <Button variant="outline" onClick={() => setOpenSessionId(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver a carpetas
          </Button>
        )}
      </div>

      {!openSession && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessions && sessions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onOpen={() => setOpenSessionId(s.id)}
                  onDelete={() => deleteSession.mutate(s.id)}
                  canDelete={!isAdmin || isAdmin}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-10 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div className="text-lg font-semibold text-foreground">Aún no tienes carpetas</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Crea tu primera carpeta para subir tus 4 fotos del día.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {openSession && (
        <SessionDetail session={openSession} isAdmin={isAdmin} currentUserId={user?.id ?? null} />
      )}
    </div>
  );
}

function SessionCard({
  session,
  onOpen,
  onDelete,
}: {
  session: PhotoSession;
  onOpen: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const { data: count } = useQuery({
    queryKey: ["photo-count", session.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("photos")
        .select("*", { count: "exact", head: true })
        .eq("session_id", session.id);
      if (error) throw error;
      return count ?? 0;
    },
  });
  return (
    <Card className="transition-all hover:border-primary/60 hover:-translate-y-0.5">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <button onClick={onOpen} className="text-left flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
              <CalendarDays className="h-3 w-3" /> Carpeta
            </div>
            <div className="text-lg font-semibold text-foreground mt-1">
              {formatDate(session.session_date)}
            </div>
            <Badge variant="outline" className="mt-3">
              {count ?? 0} / 4 fotos
            </Badge>
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Eliminar carpeta de fotos"
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminar carpeta</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminarán todas las fotos y comentarios de esta fecha. Esta acción no se puede
                  deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

const REF_ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif", "pdf", "doc", "docx", "ppt", "pptx"];
const REF_MAX_MB = 15;

type ReferenceRow = {
  id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  title: string | null;
};

function ReferencePanel({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | undefined>();

  const { data: ref, isLoading } = useQuery({
    queryKey: ["photo-reference"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photo_reference")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ReferenceRow | null;
    },
  });

  useEffect(() => {
    let cancelled = false;
    if (!ref?.storage_path) {
      setSignedUrl(undefined);
      return;
    }
    supabase.storage
      .from("photo-reference")
      .createSignedUrl(ref.storage_path, 3600)
      .then(({ data }) => {
        if (!cancelled) setSignedUrl(data?.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [ref?.storage_path]);

  const isImage = (ref?.mime_type ?? "").startsWith("image/");

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!REF_ALLOWED_EXT.includes(ext)) {
      toast.error(`Formato no permitido. Usa: ${REF_ALLOWED_EXT.join(", ")}.`);
      return;
    }
    if (file.size > REF_MAX_MB * 1024 * 1024) {
      toast.error(`El archivo no debe superar los ${REF_MAX_MB} MB.`);
      return;
    }
    setUploading(true);
    try {
      const path = `reference/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("photo-reference")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      if (ref) {
        await supabase.storage.from("photo-reference").remove([ref.storage_path]);
        const { error: updErr } = await supabase
          .from("photo_reference")
          .update({
            storage_path: path,
            original_filename: file.name,
            mime_type: file.type || null,
            size_bytes: file.size,
          })
          .eq("id", ref.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase.from("photo_reference").insert({
          storage_path: path,
          original_filename: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
        });
        if (insErr) {
          await supabase.storage.from("photo-reference").remove([path]);
          throw insErr;
        }
      }
      toast.success("Referencia actualizada");
      qc.invalidateQueries({ queryKey: ["photo-reference"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const onRemove = async () => {
    if (!ref) return;
    try {
      await supabase.storage.from("photo-reference").remove([ref.storage_path]);
      const { error } = await supabase.from("photo_reference").delete().eq("id", ref.id);
      if (error) throw error;
      toast.success("Referencia eliminada");
      qc.invalidateQueries({ queryKey: ["photo-reference"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  if (isLoading) return null;
  if (!ref && !isAdmin) return null;

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Referencia para tus fotos</CardTitle>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.ppt,.pptx"
                onChange={onUpload}
              />
              <Button
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{ background: "var(--gradient-primary)" }}
              >
                {uploading ? (
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3 mr-2" />
                )}
                {ref ? "Reemplazar" : "Subir referencia"}
              </Button>
              {ref && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminar referencia</AlertDialogTitle>
                      <AlertDialogDescription>
                        Los pacientes dejarán de ver esta referencia.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={onRemove}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Usa esta imagen como guía de postura y encuadre para las 4 fotos (frontal, posterior,
          perfil izq. y der.).
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {ref ? (
          isImage && signedUrl ? (
            <div className="w-full overflow-hidden rounded-md bg-muted">
              <img
                src={signedUrl}
                alt={ref.title ?? "Referencia de fotos"}
                className="w-full h-auto max-h-72 object-contain mx-auto"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 p-4 rounded-md border border-border bg-muted/40">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{ref.original_filename}</div>
                  <div className="text-xs text-muted-foreground">Documento de referencia</div>
                </div>
              </div>
              {signedUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={signedUrl} target="_blank" rel="noreferrer">
                    <Download className="h-3 w-3 mr-2" /> Abrir
                  </a>
                </Button>
              )}
            </div>
          )
        ) : (
          <div className="text-sm text-muted-foreground italic">
            Aún no has subido una referencia. Sube una imagen panorámica o documento guía para los
            pacientes.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SessionDetail({
  session,
  isAdmin,
  currentUserId,
}: {
  session: PhotoSession;
  isAdmin: boolean;
  currentUserId: string | null;
}) {
  const isOwner = currentUserId === session.user_id;
  const qc = useQueryClient();
  const canEditDate = isOwner || isAdmin;
  const [editingDate, setEditingDate] = useState(false);
  const [newDate, setNewDate] = useState(session.session_date);
  const [savingDate, setSavingDate] = useState(false);

  useEffect(() => {
    setNewDate(session.session_date);
    setEditingDate(false);
  }, [session.id, session.session_date]);

  const saveDate = async () => {
    if (!newDate || newDate === session.session_date) {
      setEditingDate(false);
      return;
    }
    setSavingDate(true);
    try {
      const { data, error } = await supabase
        .from("photo_sessions")
        .update({ session_date: newDate })
        .eq("id", session.id)
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("Ya existe otra carpeta con esa fecha.");
        throw error;
      }
      qc.setQueryData<PhotoSession[]>(["photo-sessions", session.user_id], (old) =>
        (old ?? [])
          .map((s) => (s.id === session.id ? (data as PhotoSession) : s))
          .sort((a, b) => (a.session_date < b.session_date ? 1 : -1)),
      );
      qc.invalidateQueries({ queryKey: ["photo-sessions", session.user_id] });
      toast.success("Fecha actualizada");
      setEditingDate(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar la fecha");
    } finally {
      setSavingDate(false);
    }
  };

  const { data: photos } = useQuery({
    queryKey: ["photos", session.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .eq("session_id", session.id);
      if (error) throw error;
      return (data ?? []) as Photo[];
    },
  });

  const byAngle = useMemo(() => {
    const m: Partial<Record<Angle, Photo>> = {};
    photos?.forEach((p) => (m[p.angle] = p));
    return m;
  }, [photos]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
            <CalendarDays className="h-3 w-3" /> Carpeta
          </div>
          {editingDate ? (
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-auto"
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
                  setNewDate(session.session_date);
                  setEditingDate(false);
                }}
                disabled={savingDate}
              >
                <X className="h-3 w-3 mr-2" /> Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="text-xl">{formatDate(session.session_date)}</CardTitle>
              {canEditDate && (
                <Button size="sm" variant="outline" onClick={() => setEditingDate(true)}>
                  <Pencil className="h-3 w-3 mr-2" /> Cambiar fecha
                </Button>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {ANGLES.map((a) => (
          <AngleSlot
            key={a.key}
            session={session}
            angle={a.key}
            label={a.label}
            photo={byAngle[a.key] ?? null}
            isAdmin={isAdmin}
            isOwner={isOwner}
            onChanged={() => {
              qc.invalidateQueries({ queryKey: ["photos", session.id] });
              qc.invalidateQueries({ queryKey: ["photo-count", session.id] });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AngleSlot({
  session,
  angle,
  label,
  photo,
  isAdmin,
  isOwner,
  onChanged,
}: {
  session: PhotoSession;
  angle: Angle;
  label: string;
  photo: Photo | null;
  isAdmin: boolean;
  isOwner: boolean;
  onChanged: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | undefined>(undefined);
  const [patientComment, setPatientComment] = useState(photo?.patient_comment ?? "");
  const [nutriComment, setNutriComment] = useState(photo?.nutritionist_comment ?? "");
  const [savingPatient, setSavingPatient] = useState(false);
  const [savingNutri, setSavingNutri] = useState(false);

  useEffect(() => {
    setPatientComment(photo?.patient_comment ?? "");
    setNutriComment(photo?.nutritionist_comment ?? "");
  }, [photo?.id, photo?.patient_comment, photo?.nutritionist_comment]);

  useEffect(() => {
    let cancelled = false;
    if (!photo?.storage_path) {
      setImgUrl(undefined);
      return;
    }
    supabase.storage
      .from("patient-photos")
      .createSignedUrl(photo.storage_path, 3600)
      .then(({ data }) => {
        if (!cancelled) setImgUrl(data?.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [photo?.storage_path]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Debe ser una imagen.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen no debe superar los 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${session.user_id}/${session.id}/${angle}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("patient-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      if (photo) {
        // remove previous file
        await supabase.storage.from("patient-photos").remove([photo.storage_path]);
        const { error } = await supabase
          .from("photos")
          .update({ storage_path: path })
          .eq("id", photo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("photos").insert({
          session_id: session.id,
          user_id: session.user_id,
          angle,
          storage_path: path,
        });
        if (error) throw error;
      }
      toast.success("Foto subida");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir la foto");
    } finally {
      setUploading(false);
    }
  };

  const savePatient = async () => {
    if (!photo) {
      toast.error("Sube primero la foto.");
      return;
    }
    setSavingPatient(true);
    try {
      const { error } = await supabase
        .from("photos")
        .update({ patient_comment: patientComment })
        .eq("id", photo.id);
      if (error) throw error;
      toast.success("Comentario del paciente guardado");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSavingPatient(false);
    }
  };

  const saveNutri = async () => {
    if (!photo) {
      toast.error("Aún no hay foto.");
      return;
    }
    setSavingNutri(true);
    try {
      const { error } = await supabase
        .from("photos")
        .update({ nutritionist_comment: nutriComment })
        .eq("id", photo.id);
      if (error) throw error;
      toast.success("Comentario del nutricionista guardado");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSavingNutri(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{label}</CardTitle>
          {photo ? (
            <Badge variant="outline" className="text-[10px]">
              Subida
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">
              Pendiente
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-muted/40 border border-border flex items-center justify-center">
          {imgUrl ? (
            <img src={imgUrl} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="text-center text-muted-foreground text-sm">
              <Camera className="h-8 w-8 mx-auto mb-2 opacity-60" />
              Sin foto
            </div>
          )}
        </div>

        {isOwner && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" /> Subiendo…
                </>
              ) : (
                <>
                  <Upload className="h-3 w-3 mr-2" />
                  {photo ? "Reemplazar foto" : "Subir foto"}
                </>
              )}
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Comentario del paciente
          </label>
          <Textarea
            value={patientComment}
            onChange={(e) => setPatientComment(e.target.value)}
            placeholder={
              isOwner ? "¿Cómo te ves? Sensaciones, notas…" : "Sin comentario del paciente"
            }
            rows={3}
            disabled={!isOwner || !photo}
          />
          {isOwner && (
            <Button
              size="sm"
              variant="secondary"
              onClick={savePatient}
              disabled={savingPatient || !photo}
            >
              {savingPatient ? (
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              ) : (
                <Save className="h-3 w-3 mr-2" />
              )}
              Guardar
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
            placeholder={
              isAdmin ? "Observaciones profesionales…" : "Aún sin comentario del nutricionista"
            }
            rows={3}
            disabled={!isAdmin || !photo}
          />
          {isAdmin && (
            <Button
              size="sm"
              variant="secondary"
              onClick={saveNutri}
              disabled={savingNutri || !photo}
            >
              {savingNutri ? (
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              ) : (
                <Save className="h-3 w-3 mr-2" />
              )}
              Guardar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
