import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Salad,
  ArrowLeft,
  Loader2,
  Upload,
  Download,
  Trash2,
  Maximize2,
  CalendarDays,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({
    meta: [
      { title: "Plan nutricional — Lic. Diego Rivera" },
      { name: "description", content: "Consulta tu plan nutricional actualizado en PDF." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    patient: typeof s.patient === "string" ? s.patient : undefined,
  }),
  component: PlanPage,
});

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  program_start_date: string | null;
  program_end_date: string | null;
};

type Plan = {
  id: string;
  user_id: string;
  storage_path: string;
  original_filename: string;
  size_bytes: number | null;
  created_at: string;
  updated_at: string;
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const p = new Date(d + "T00:00:00");
  if (Number.isNaN(p.getTime())) return "—";
  return p.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function PlanPage() {
  const { user, isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const { patient: patientParam } = Route.useSearch();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(patientParam ?? null);
  useEffect(() => {
    if (patientParam) setSelectedPatientId(patientParam);
  }, [patientParam]);

  const targetUserId = isAdmin ? selectedPatientId : (user?.id ?? null);

  // Admin: list of patients
  const { data: patients } = useQuery({
    queryKey: ["plan", "patients"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, program_start_date, program_end_date")
        .order("full_name", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  // Auto-select own profile for patients; for admins keep manual selection
  useEffect(() => {
    if (!isAdmin && user?.id) setSelectedPatientId(user.id);
  }, [isAdmin, user?.id]);

  // Target profile (dates)
  const { data: profile } = useQuery({
    queryKey: ["plan", "profile", targetUserId],
    enabled: !!targetUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, program_start_date, program_end_date")
        .eq("id", targetUserId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  // Current plan (latest)
  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["plan", "current", targetUserId],
    enabled: !!targetUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_plans")
        .select("*")
        .eq("user_id", targetUserId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Plan | null;
    },
  });

  // Signed URL for the PDF (for embed + download)
  const { data: signedUrl } = useQuery({
    queryKey: ["plan", "signed", plan?.storage_path],
    enabled: !!plan?.storage_path,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("nutrition-plans")
        .createSignedUrl(plan!.storage_path, 60 * 60);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!plan) return;
      await supabase.storage.from("nutrition-plans").remove([plan.storage_path]);
      const { error } = await supabase.from("nutrition_plans").delete().eq("id", plan.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan eliminado");
      qc.invalidateQueries({ queryKey: ["plan", "current", targetUserId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !targetUserId || !user) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Solo se permite formato PDF.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("El archivo no debe superar los 25 MB.");
      return;
    }
    setUploading(true);
    try {
      // Remove previous file if any (keeps storage clean)
      if (plan?.storage_path) {
        await supabase.storage.from("nutrition-plans").remove([plan.storage_path]);
      }
      const path = `${targetUserId}/plan-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("nutrition-plans")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });
      if (upErr) throw upErr;

      if (plan) {
        const { error: updErr } = await supabase
          .from("nutrition_plans")
          .update({
            storage_path: path,
            original_filename: file.name,
            size_bytes: file.size,
            uploaded_by: user.id,
          })
          .eq("id", plan.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase.from("nutrition_plans").insert({
          user_id: targetUserId,
          storage_path: path,
          original_filename: file.name,
          size_bytes: file.size,
          uploaded_by: user.id,
        });
        if (insErr) throw insErr;
      }
      toast.success("Plan nutricional subido");
      qc.invalidateQueries({ queryKey: ["plan", "current", targetUserId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload() {
    if (!signedUrl || !plan) return;
    try {
      const res = await fetch(signedUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = plan.original_filename || "plan-nutricional.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("No se pudo descargar el archivo");
    }
  }

  function toggleFullscreen() {
    const el = viewerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  const startDate = profile?.program_start_date ?? null;
  const endDate = profile?.program_end_date ?? null;

  const patientOptions = useMemo(
    () =>
      (patients ?? []).map((p) => ({
        value: p.id,
        label: p.full_name || p.email || p.id.slice(0, 8),
      })),
    [patients],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/dashboard"
            className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al panel
          </Link>
          <h1 className="flex items-center gap-3 text-2xl font-semibold md:text-3xl">
            <Salad className="h-7 w-7 text-primary" /> Plan nutricional
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? "Sube o reemplaza el plan nutricional actual del paciente."
              : "Consulta tu plan nutricional actualizado."}
          </p>
        </div>

        {isAdmin && (
          <div className="min-w-[260px] space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Paciente
            </Label>
            <Select
              value={selectedPatientId ?? undefined}
              onValueChange={(v) => setSelectedPatientId(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar paciente" />
              </SelectTrigger>
              <SelectContent>
                {patientOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Program dates */}
      <Card className="mb-6" style={{ boxShadow: "var(--shadow-elegant)" }}>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: "var(--gradient-primary)" }}
            >
              <CalendarDays className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Programa nutricional
              </div>
              <div className="text-sm text-foreground">
                {isAdmin && profile?.full_name && (
                  <span className="mr-3 font-medium">{profile.full_name}</span>
                )}
                <span className="text-muted-foreground">Inicio: </span>
                <span className="font-semibold">{formatDate(startDate)}</span>
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="text-muted-foreground">Término: </span>
                <span className="font-semibold">{formatDate(endDate)}</span>
              </div>
            </div>
          </div>

          {plan && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <FileText className="h-3 w-3" />
                Actualizado el {formatDate(plan.updated_at.slice(0, 10))}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin controls */}
      {isAdmin && targetUserId && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={handleUpload}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {plan ? "Reemplazar plan (PDF)" : "Subir plan (PDF)"}
          </Button>
          {plan && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar el plan actual?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminará el archivo PDF del paciente. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteMut.mutate()}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}

      {/* Viewer */}
      {!targetUserId ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Selecciona un paciente para ver o subir su plan nutricional.
          </CardContent>
        </Card>
      ) : planLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !plan ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            {isAdmin
              ? "Este paciente aún no tiene un plan nutricional cargado."
              : "Tu nutricionista aún no ha subido tu plan nutricional. Vuelve pronto."}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="truncate text-sm text-muted-foreground">
              <FileText className="mr-1 inline h-4 w-4 align-text-bottom" />
              {plan.original_filename}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                <Maximize2 className="mr-2 h-4 w-4" /> Pantalla completa
              </Button>
              <Button size="sm" onClick={handleDownload} disabled={!signedUrl}>
                <Download className="mr-2 h-4 w-4" /> Descargar PDF
              </Button>
            </div>
          </div>

          <div
            ref={viewerRef}
            className="w-full overflow-hidden rounded-lg border bg-background"
            style={{ height: "calc(100vh - 260px)", minHeight: "70vh" }}
          >
            {signedUrl ? (
              <iframe
                title="Plan nutricional"
                src={`${signedUrl}#toolbar=1&navpanes=0&view=FitH`}
                className="h-full w-full"
                style={{ border: 0 }}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
