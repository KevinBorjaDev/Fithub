import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, Search, CalendarDays, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SURVEY_SECTIONS, type SurveyAnswers } from "./_authenticated.survey";

export const Route = createFileRoute("/_authenticated/admin-surveys")({
  head: () => ({
    meta: [
      { title: "Encuestas mensuales — Panel administrador" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSurveysPage,
});

type PatientRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  sport: string | null;
};

type SurveyRow = {
  id: string;
  user_id: string;
  answers: SurveyAnswers;
  completed_at: string | null;
  created_at: string;
};

function AdminSurveysPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [openSurvey, setOpenSurvey] = useState<{ patient: PatientRow; survey: SurveyRow } | null>(
    null,
  );

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [loading, isAdmin, navigate]);

  const { data: patients } = useQuery({
    queryKey: ["admin", "surveys", "patients"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,full_name,avatar_url,sport")
        .order("full_name", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as PatientRow[];
    },
  });

  const { data: surveys } = useQuery({
    queryKey: ["admin", "surveys", "all"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("monthly_surveys")
        .select("id,user_id,answers,completed_at,created_at")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SurveyRow[];
    },
  });

  const byUser = useMemo(() => {
    const m = new Map<string, SurveyRow[]>();
    for (const s of surveys ?? []) {
      if (!m.has(s.user_id)) m.set(s.user_id, []);
      m.get(s.user_id)!.push(s);
    }
    return m;
  }, [surveys]);

  const filtered = useMemo(() => {
    if (!patients) return [];
    const q = search.trim().toLowerCase();
    const list = q
      ? patients.filter(
          (p) =>
            (p.full_name ?? "").toLowerCase().includes(q) ||
            (p.email ?? "").toLowerCase().includes(q) ||
            (p.sport ?? "").toLowerCase().includes(q),
        )
      : patients;
    return list.filter((p) => (byUser.get(p.id)?.length ?? 0) > 0 || !q);
  }, [patients, byUser, search]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al panel
          </Link>
        </Button>
      </div>

      <Card style={{ boxShadow: "var(--shadow-elegant)" }}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ background: "var(--gradient-primary)" }}
            >
              <ClipboardList className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle>Encuestas mensuales</CardTitle>
              <CardDescription>
                Historial de encuestas enviadas por cada paciente. Selecciona una fecha para ver
                todas las respuestas.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full sm:w-80 mb-4">
            <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sin resultados.</p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((p) => {
                const list = byUser.get(p.id) ?? [];
                return (
                  <div key={p.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={p.avatar_url ?? undefined} />
                        <AvatarFallback>
                          {(p.full_name ?? p.email ?? "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{p.full_name ?? "Sin nombre"}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-wrap gap-2">
                      {list.length === 0 ? (
                        <Badge variant="outline" className="text-[11px]">
                          Sin encuestas
                        </Badge>
                      ) : (
                        list.map((s) => (
                          <Button
                            key={s.id}
                            size="sm"
                            variant="outline"
                            onClick={() => setOpenSurvey({ patient: p, survey: s })}
                          >
                            <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                            {format(parseISO(s.completed_at!), "d MMM yyyy", { locale: es })}
                          </Button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <SurveyDetailDialog data={openSurvey} onClose={() => setOpenSurvey(null)} />
    </div>
  );
}

function SurveyDetailDialog({
  data,
  onClose,
}: {
  data: { patient: PatientRow; survey: SurveyRow } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!data} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {data?.patient.full_name ?? data?.patient.email}
          </DialogTitle>
          <DialogDescription>
            Encuesta enviada el{" "}
            {data?.survey.completed_at
              ? format(parseISO(data.survey.completed_at), "d 'de' MMMM yyyy", { locale: es })
              : "—"}
          </DialogDescription>
        </DialogHeader>
        {data && (
          <div className="space-y-5">
            {SURVEY_SECTIONS.map((section) => (
              <div
                key={section.id}
                className="rounded-lg border"
                style={{ borderColor: section.color }}
              >
                <div
                  className="px-4 py-2 border-b flex items-center gap-2 font-medium"
                  style={{ background: `${section.color}12`, color: section.color }}
                >
                  <section.icon className="h-4 w-4" />
                  {section.title}
                </div>
                <div className="divide-y">
                  {section.questions.map((q, idx) => {
                    const a = data.survey.answers?.[q.key] ?? {};
                    return (
                      <div key={q.key} className="p-3 text-sm">
                        <div className="text-foreground">
                          <span
                            className="text-xs font-semibold mr-1.5"
                            style={{ color: section.color }}
                          >
                            {idx + 1}.
                          </span>
                          {q.label}
                        </div>
                        {!q.commentOnly && (
                          <div className="mt-1.5">
                            <span className="text-xs uppercase tracking-wider text-muted-foreground mr-2">
                              Respuesta:
                            </span>
                            <Badge variant="secondary">
                              {a.value === undefined || a.value === null || a.value === ""
                                ? "—"
                                : q.kind === "yesno"
                                  ? String(a.value).toLowerCase() === "si"
                                    ? "Sí"
                                    : "No"
                                  : String(a.value)}
                            </Badge>
                          </div>
                        )}
                        {(a.comment ?? "").trim() ? (
                          <div className="mt-1.5 text-muted-foreground whitespace-pre-wrap">
                            <span className="text-xs uppercase tracking-wider mr-2">
                              Comentario:
                            </span>
                            {a.comment}
                          </div>
                        ) : q.commentOnly ? (
                          <div className="mt-1.5 text-xs italic text-muted-foreground">
                            Sin comentario
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
