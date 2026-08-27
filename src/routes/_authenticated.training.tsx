import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Dumbbell,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Save,
  Check,
  AlertTriangle,
  CheckCircle2,
  FileBarChart,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoAsset from "@/assets/diego-rivera-logo-new.png.asset.json";
import { Download } from "lucide-react";

async function fetchLogoDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo cargar el logo");
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Error leyendo el logo"));
    reader.readAsDataURL(blob);
  });
}

function drawSectionBar(
  doc: jsPDF,
  title: string,
  y: number,
  rgb: [number, number, number],
): number {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(40, y, 4, 16, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(title, 52, y + 12);
  return y + 20;
}

export const Route = createFileRoute("/_authenticated/training")({
  head: () => ({
    meta: [
      { title: "Plan de entrenamiento — Lic. Diego Rivera" },
      { name: "description", content: "Rutina semanal, cargas y progreso." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    patient: typeof s.patient === "string" ? s.patient : undefined,
  }),
  component: TrainingPage,
});

type TrainingPlan = {
  id: string;
  user_id: string;
  title: string;
  objective: string | null;
  start_date: string;
  weeks_count: number;
  current_week: number;
  days_per_week?: number | null;
};
type DayType = "push_day" | "pull_day" | "full_leg" | "full_torso" | "full_gluteo" | "custom";
type TrainingDay = {
  id: string;
  plan_id: string;
  week_number: number;
  day_number: number;
  day_type: DayType;
  title: string | null;
};
type TrainingExercise = {
  id: string;
  day_id: string;
  order_num: number;
  muscle_group: string | null;
  exercise_name: string;
  comment: string | null;
  patient_comment: string | null;
  video_url: string | null;
  programmed_sets: number;
  programmed_reps: string | null;
  warmup_sets: number;
  rest_seconds: number | null;
  completed_at: string | null;
};
type TrainingSet = {
  id: string;
  exercise_id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rir: string | null;
};

const DAY_TYPES = [
  { value: "push_day", label: "Push day" },
  { value: "pull_day", label: "Pull day" },
  { value: "full_leg", label: "Full leg" },
  { value: "full_torso", label: "Full torso" },
  { value: "full_gluteo", label: "Full glúteo" },
  { value: "custom", label: "Personalizado" },
];

// Catálogo de ejercicios por grupo muscular
const EXERCISE_CATALOG: Record<string, string[]> = {
  Abdomen: [
    "Crunch en polea alta con soga",
    "Elevación de piernas abs",
    "Máquina curl abs",
    "Abs con rueda",
    "Elevación de piernas en máquina apoyado",
    "Elevación rodillas al pecho",
    "Elevación de piernas colgado en barra",
  ],
  Abductor: [
    "Abductor de cadera en máquina",
    "Abductor en máquina con disco",
    "Abductor en polea unilateral",
  ],
  Aductor: ["Aductor de cadera en máquina", "Sentadilla sumo", "Aductor en polea unilateral"],
  Antebrazos: [
    "Elevación braquial con barra antebrazos en polea",
    "Jalón gato antebrazos",
    "Jalón polea baja antebrazos",
    "Jalón polea horizontal antebrazos",
  ],
  Bíceps: [
    "Curl bíceps con barra en polea",
    "Curl bíceps martillo con mancuerna en predicador",
    "Curl de bíceps bayesian unilateral en polea",
    "Curl de bíceps con barra parado",
    "Curl de bíceps con soga en polea",
    "Curl de bíceps máquina predicador",
    "Curl de bíceps martillo con mancuerna unilateral parado",
    "Curl de bíceps supino con mancuerna en predicador",
    "Curl de bíceps supino unilateral con mancuerna parado",
    "Curl de bíceps unilateral",
    "Curl unilateral en máquina sentado",
    "Curl de bíceps en máquina sentado",
    "Curl de bíceps bayesian unilateral martillo en polea",
  ],
  Cuádriceps: [
    "Extensión de cuádriceps en máquina sentado",
    "Hack sentado 45°",
    "Hack squat convencional",
    "Prensa convencional",
    "Prensa horizontal en máquina con cable",
    "Prensa pendular convencional",
    "Prensa unilateral horizontal en máquina con cable",
    "Sentadilla abierta en hack pendular",
    "Prensa pendular sentado con disco",
    "Sentadilla Smith",
    "Prensa vertical en máquina pendular",
    "Sentadilla en barra libre",
    "Zancada en Smith",
    "Sissy squat",
    "Zancadas con mancuernas",
    "Sentadilla en belt squat en máquina de disco",
    "Prensa vertical convencional con disco",
    "Sentadilla con peso corporal",
  ],
  "Deltoides Posteriores": ["Revers fly unilateral", "Revers fly unilateral en polea"],
  "Deltoides Laterales": [
    "Elevación lateral con mancuerna parado",
    "Elevación lateral con mancuerna sentado",
    "Elevación lateral con máquina de disco parado",
    "Elevación lateral en máquina sentado con rodillo",
    "Elevación lateral en polea con banco 45°",
    "Elevación unilateral en polea baja",
  ],
  "Deltoides Anteriores": [
    "Press militar en Smith",
    "Press militar con barra en banco 75°",
    "Press militar con mancuerna cerrado en banco 75°",
    "Press militar con mancuerna abierto en banco 75°",
    "Press militar en máquina en polea abierto",
    "Press militar máquina en polea cerrado",
    "Press militar máquina de disco",
    "Elevación frontal unilateral en polea",
    "Press militar en poleas con banco",
  ],
  "Dorsal Ancho": [
    "Jalón al pecho en polea agarre cerrado",
    "Jalón al pecho en polea con barra",
    "Jalón al pecho en polea MAG abierto",
    "Jalón al pecho en polea MAG cerrado",
    "Jalón al pecho en polea MAG neutro",
    "Jalón en máquina pendular",
    "Jalón pull down máquina con disco",
    "Jalón unilateral en máquina con disco",
    "Jalón unilateral en polea alta con banco",
    "Jalón unilateral vertical en polea",
    "Jalón unilateral en polea horizontal con banco",
    "Pull down abierto en máquina",
    "Pull down neutro en máquina",
    "Pull ups asistidos máquina",
    "Pull ups peso libre",
    "Remo unilateral parado caballo",
    "Pull ups en máquina pendular",
    "Pull ups unilateral en máquina péndulo dual",
    "Pull over en polea alta",
  ],
  "Espalda Alta": [
    "Remo con mancuerna en banco",
    "Jalón remo MAG polea",
    "Jalón remo en máquina polea",
    "Jalón remo en polea con barra",
    "Remo en máquina con disco caballo",
    "Remo T con disco",
    "Remo T con disco parado",
  ],
  "Espalda Baja": [],
  Glúteos: [
    "Hip thrust con barra",
    "Hip thrust máquina con cinturón",
    "Hip thrust máquina con disco",
    "Búlgaras en Smith con banco plano",
    "Extensión de glúteo en polea alta con banco 75°",
    "Press unilateral con cajón en polea baja",
    "Press unilateral con cajón en Smith",
    "Búlgaras en máquina pendular",
    "Hip thrust en Smith",
  ],
  Isquios: [
    "Curl femoral sentado",
    "Curl femoral tumbado",
    "Curl femoral unilateral parado",
    "Peso muerto con mancuernas",
    "Peso muerto en Smith con cajón",
    "Peso muerto unilateral con mancuerna",
    "Bisagra de cadera para isquiotibial en prensa",
    "Peso muerto en máquina pendular",
  ],
  Pantorrillas: [
    "Extensión de pantorrilla en máquina sentado",
    "Extensión de pantorrilla en máquina parado",
    "Extensión de pantorrilla en prensa convencional",
    "Extensión de pantorrilla en hack sentado",
    "Extensión de pantorrilla en prensa horizontal",
    "Extensión de pantorrilla en hack convencional",
    "Extensión de pantorrillas en Smith",
  ],
  Pecho: [
    "Press pecho banco inclinado mancuernas",
    "Press pecho banco plano mancuernas",
    "Press máquina con disco inclinado agarre abierto",
    "Press máquina con disco inclinado agarre cerrado",
    "Press plano abierto en máquina con cable",
    "Press plano cerrado en máquina con cable",
    "Press inclinado abierto en máquina con cable",
    "Press inclinado cerrado en máquina con cable",
    "Fondos en máquina con disco",
    "Fondos en máquina con cable",
    "Press inclinado en Smith",
    "Press plano en Smith",
    "Press plano abierto en máquina con disco",
    "Press inclinado en máquina con disco",
    "Press inclinado en polea con banco",
    "Aperturas en polea en banco inclinado",
    "Press sentado en polea con banco",
    "Press declinado en polea con banco",
    "Peck fly en máquina aperturas",
    "Aperturas en máquina con brazo flexionado",
    "Aperturas en máquina con disco parado",
    "Fondos en paralelas asistidos en máquina",
    "Fondos en paralelas",
    "Press abierto en máquina sentado",
    "Press cerrado en máquina sentado",
    "Aperturas con mancuernas en banco",
    "Push ups en suelo asistido",
    "Push ups en suelo convencional",
    "Press inclinado con barra",
    "Bench press convencional con barra",
  ],
  Trapecios: ["Jalón con barra en polea baja trapecios", "Jalón con barra Smith o libre"],
  Tríceps: [
    "Extensión de tríceps en máquina con disco",
    "Press tríceps en Smith",
    "Extensión de tríceps con barra en polea",
    "Extensión de tríceps con soga en polea",
    "Extensión de tríceps unilateral katana en polea",
    "Extensión de tríceps overhead en polea",
    "Extensión de tríceps en máquina predicador",
    "Extensión de tríceps unilateral en máquina predicador",
    "Extensión de tríceps agarre V en polea",
    "Extensión de tríceps overhead con banco sentado",
    "Extensión tríceps overhead con barra en banco",
    "Extensión tríceps overhead con mancuernas en banco",
    "Extensión de tríceps con cable cruzado",
  ],
};
const MUSCLE_GROUPS = Object.keys(EXERCISE_CATALOG);

// Hook: debounced auto-save
function useDebouncedEffect(fn: () => void, deps: unknown[], delay = 700) {
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const t = setTimeout(fn, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function SaveIndicator({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "saving")
    return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
  if (status === "saved") return <Check className="h-3 w-3 text-emerald-600" />;
  if (status === "error") return <AlertTriangle className="h-3 w-3 text-red-600" />;
  return null;
}

// Replica los ejercicios/series de la Semana 1 hacia las semanas objetivo.
// Solo copia en días que aún no tienen ejercicios, para no sobrescribir progreso.
async function replicateWeek1({
  planId,
  days,
  exercises,
  sets,
  targetWeeks,
}: {
  planId: string;
  days: TrainingDay[];
  exercises: TrainingExercise[];
  sets: TrainingSet[];
  targetWeeks: number[];
}) {
  const week1Days = days.filter((d) => d.week_number === 1);
  if (week1Days.length === 0) return;
  for (const w of targetWeeks) {
    for (const srcDay of week1Days) {
      let targetDay = days.find((d) => d.week_number === w && d.day_number === srcDay.day_number);
      if (!targetDay) {
        const { data, error } = await supabase
          .from("training_days")
          .insert({
            plan_id: planId,
            week_number: w,
            day_number: srcDay.day_number,
            day_type: srcDay.day_type,
            title: srcDay.title,
          })
          .select()
          .single();
        if (error) throw error;
        targetDay = data as TrainingDay;
      } else {
        const existing = exercises.filter((e) => e.day_id === targetDay!.id);
        if (existing.length > 0) continue; // ya tiene rutina, no sobrescribir
      }
      const srcExs = exercises.filter((e) => e.day_id === srcDay.id);
      for (const ex of srcExs) {
        const { data: newEx, error: exErr } = await supabase
          .from("training_exercises")
          .insert({
            day_id: targetDay.id,
            order_num: ex.order_num,
            muscle_group: ex.muscle_group,
            exercise_name: ex.exercise_name,
            comment: ex.comment,
            video_url: ex.video_url,
            programmed_sets: ex.programmed_sets,
            programmed_reps: ex.programmed_reps,
            warmup_sets: ex.warmup_sets,
            rest_seconds: ex.rest_seconds,
          })
          .select()
          .single();
        if (exErr) throw exErr;
        const srcSets = sets.filter((s) => s.exercise_id === ex.id);
        if (srcSets.length > 0) {
          const { error: sErr } = await supabase
            .from("training_sets")
            .insert(
              srcSets.map((s) => ({ exercise_id: newEx.id, set_number: s.set_number, rir: s.rir })),
            );
          if (sErr) throw sErr;
        }
      }
    }
  }
}

function TrainingPage() {
  const { user, isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const { patient: patientParam } = Route.useSearch();
  const [selectedPatient, setSelectedPatient] = useState<string | null>(patientParam ?? null);
  useEffect(() => {
    if (patientParam) setSelectedPatient(patientParam);
  }, [patientParam]);

  const targetUserId = isAdmin ? selectedPatient : (user?.id ?? null);

  const { data: patients } = useQuery({
    queryKey: ["training", "patients"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .order("full_name", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (isAdmin && !selectedPatient && patients && patients.length > 0) {
      setSelectedPatient(patients[0].id);
    }
  }, [isAdmin, selectedPatient, patients]);

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ["training", "plan", targetUserId],
    enabled: !!targetUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_plans")
        .select("*")
        .eq("user_id", targetUserId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as TrainingPlan | null;
    },
  });

  const createPlan = useMutation({
    mutationFn: async () => {
      if (!targetUserId) throw new Error("Sin paciente");
      const { data, error } = await supabase
        .from("training_plans")
        .insert({
          user_id: targetUserId,
          title: "Rutina semanal",
          objective: "",
          start_date: new Date().toISOString().slice(0, 10),
          weeks_count: 1,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training", "plan", targetUserId] });
      toast.success("Plan creado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Dumbbell className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-lg font-semibold leading-tight">Plan de entrenamiento</h1>
              <p className="text-xs text-muted-foreground">Rutina semanal y cargas</p>
            </div>
          </div>
          {isAdmin && <Badge variant="secondary">Administrador</Badge>}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {isAdmin && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Paciente</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedPatient ?? ""} onValueChange={(v) => setSelectedPatient(v)}>
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Selecciona un paciente" />
                </SelectTrigger>
                <SelectContent>
                  {(patients ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name ?? p.email ?? p.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {!targetUserId ? (
          <p className="text-sm text-muted-foreground">Selecciona un paciente para ver su plan.</p>
        ) : planLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : !plan ? (
          <Card>
            <CardContent className="py-10 text-center space-y-4">
              <p className="text-muted-foreground">
                Este paciente aún no tiene plan de entrenamiento.
              </p>
              {isAdmin && (
                <Button onClick={() => createPlan.mutate()} disabled={createPlan.isPending}>
                  <Plus className="mr-2 h-4 w-4" /> Crear plan
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <PlanEditor plan={plan} isAdmin={isAdmin} />
        )}
      </main>
    </div>
  );
}

function PlanEditor({ plan, isAdmin }: { plan: TrainingPlan; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(plan.title);
  const [objective, setObjective] = useState(plan.objective ?? "");
  const [startDate, setStartDate] = useState(plan.start_date);
  const [weeksCount, setWeeksCount] = useState(plan.weeks_count);
  const [daysPerWeek, setDaysPerWeek] = useState(plan.days_per_week ?? 7);

  useEffect(() => {
    setTitle(plan.title);
    setObjective(plan.objective ?? "");
    setStartDate(plan.start_date);
    setWeeksCount(plan.weeks_count);
    setDaysPerWeek(plan.days_per_week ?? 7);
  }, [plan.id, plan.title, plan.objective, plan.start_date, plan.weeks_count, plan.days_per_week]);

  const saveInfo = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("training_plans")
        .update({
          title,
          objective,
          start_date: startDate,
          weeks_count: weeksCount,
          days_per_week: daysPerWeek,
        })
        .eq("id", plan.id);
      if (error) throw error;
      // Auto-replicar Semana 1 a las nuevas semanas si aumentó la duración
      if (weeksCount > 1) {
        await replicateWeek1({
          planId: plan.id,
          days: days ?? [],
          exercises: exercises ?? [],
          sets: sets ?? [],
          targetWeeks: Array.from({ length: weeksCount - 1 }, (_, i) => i + 2),
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training", "plan", plan.user_id] });
      qc.invalidateQueries({ queryKey: ["training", "days", plan.id] });
      qc.invalidateQueries({ queryKey: ["training", "exercises", plan.id] });
      qc.invalidateQueries({ queryKey: ["training", "sets", plan.id] });
      toast.success("Guardado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: days } = useQuery({
    queryKey: ["training", "days", plan.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_days")
        .select("*")
        .eq("plan_id", plan.id)
        .order("week_number")
        .order("day_number");
      if (error) throw error;
      return (data ?? []) as TrainingDay[];
    },
  });

  const { data: exercises } = useQuery({
    queryKey: ["training", "exercises", plan.id],
    queryFn: async () => {
      const dayIds = (days ?? []).map((d) => d.id);
      if (dayIds.length === 0) return [] as TrainingExercise[];
      const { data, error } = await supabase
        .from("training_exercises")
        .select("*")
        .in("day_id", dayIds)
        .order("order_num");
      if (error) throw error;
      return (data ?? []) as TrainingExercise[];
    },
    enabled: !!days,
  });

  const { data: sets } = useQuery({
    queryKey: ["training", "sets", plan.id],
    queryFn: async () => {
      const exIds = (exercises ?? []).map((e) => e.id);
      if (exIds.length === 0) return [] as TrainingSet[];
      const { data, error } = await supabase
        .from("training_sets")
        .select("*")
        .in("exercise_id", exIds)
        .order("set_number");
      if (error) throw error;
      return (data ?? []) as TrainingSet[];
    },
    enabled: !!exercises,
  });

  const weeks = Array.from({ length: plan.weeks_count }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* General info */}
      <Card>
        <CardHeader>
          <CardTitle>Información general del plan</CardTitle>
          <CardDescription>Datos generales de la rutina semanal.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!isAdmin} />
          </div>
          <div>
            <Label>Fecha de inicio</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
          <div>
            <Label>Duración (semanas)</Label>
            <Select
              value={String(weeksCount)}
              onValueChange={(v) => setWeeksCount(Number(v))}
              disabled={!isAdmin}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} semana{n > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Días de entrenamiento por semana</Label>
            <Select
              value={String(daysPerWeek)}
              onValueChange={(v) => setDaysPerWeek(Number(v))}
              disabled={!isAdmin}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} día{n > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-4">
            <Label>Objetivo del entrenamiento</Label>
            <Textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              disabled={!isAdmin}
              rows={2}
            />
          </div>
          {isAdmin && (
            <div className="md:col-span-4">
              <Button onClick={() => saveInfo.mutate()} disabled={saveInfo.isPending}>
                <Save className="mr-2 h-4 w-4" /> Guardar información
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top-level tabs: Plan y Reporte */}
      <Tabs defaultValue="plan">
        <TabsList>
          <TabsTrigger value="plan">Plan semanal</TabsTrigger>
          <TabsTrigger value="report">
            <FileBarChart className="mr-1 h-4 w-4" /> Reporte de sesiones
          </TabsTrigger>
        </TabsList>
        <TabsContent value="plan" className="mt-4">
          <WeekPanel
            plan={plan}
            weekNumber={plan.current_week ?? 1}
            days={(days ?? []).filter((d) => d.week_number === 1)}
            allDays={days ?? []}
            exercises={exercises ?? []}
            sets={sets ?? []}
            isAdmin={isAdmin}
          />
        </TabsContent>
        <TabsContent value="report" className="mt-4">
          <SessionReport
            plan={plan}
            days={days ?? []}
            exercises={exercises ?? []}
            sets={sets ?? []}
            weeks={weeks}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WeekPanel({
  plan,
  weekNumber,
  days,
  allDays,
  exercises,
  sets,
  isAdmin,
}: {
  plan: TrainingPlan;
  weekNumber: number;
  days: TrainingDay[];
  allDays: TrainingDay[];
  exercises: TrainingExercise[];
  sets: TrainingSet[];
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const daysPerWeek = Math.min(7, Math.max(1, plan.days_per_week ?? 7));
  const dayNumbers = Array.from({ length: daysPerWeek }, (_, i) => i + 1);
  const [activeDay, setActiveDay] = useState("1");

  const createDay = useMutation({
    mutationFn: async (dayNumber: number) => {
      const { data, error } = await supabase
        .from("training_days")
        .insert({
          plan_id: plan.id,
          week_number: weekNumber,
          day_number: dayNumber,
          day_type: "custom",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training", "days", plan.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Tabs value={activeDay} onValueChange={setActiveDay}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList className="flex flex-wrap h-auto">
          {dayNumbers.map((n) => (
            <TabsTrigger key={n} value={String(n)}>
              Día {n}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {dayNumbers.map((n) => {
        const day = days.find((d) => d.day_number === n);
        return (
          <TabsContent key={n} value={String(n)} className="mt-4">
            {!day ? (
              <Card>
                <CardContent className="py-8 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">Día {n} sin planificar.</p>
                  {isAdmin && (
                    <Button onClick={() => createDay.mutate(n)} disabled={createDay.isPending}>
                      <Plus className="mr-2 h-4 w-4" /> Crear día {n}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <DayPanel
                plan={plan}
                day={day}
                allDays={allDays}
                exercises={exercises.filter((e) => e.day_id === day.id)}
                allExercises={exercises}
                sets={sets}
                isAdmin={isAdmin}
              />
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

function DayPanel({
  plan,
  day,
  allDays,
  exercises,
  allExercises,
  sets,
  isAdmin,
}: {
  plan: TrainingPlan;
  day: TrainingDay;
  allDays: TrainingDay[];
  exercises: TrainingExercise[];
  allExercises: TrainingExercise[];
  sets: TrainingSet[];
  isAdmin: boolean;
}) {
  const qc = useQueryClient();

  const updateDay = useMutation({
    mutationFn: async (patch: Partial<TrainingDay>) => {
      const { error } = await supabase.from("training_days").update(patch).eq("id", day.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training", "days", plan.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addExercise = useMutation({
    mutationFn: async () => {
      const nextOrder = (exercises[exercises.length - 1]?.order_num ?? 0) + 1;
      const { data, error } = await supabase
        .from("training_exercises")
        .insert({
          day_id: day.id,
          order_num: nextOrder,
          exercise_name: "Nuevo ejercicio",
          programmed_sets: 3,
        })
        .select()
        .single();
      if (error) throw error;
      // Create 3 default sets
      const { error: e2 } = await supabase
        .from("training_sets")
        .insert([1, 2, 3].map((n) => ({ exercise_id: data.id, set_number: n })));
      if (e2) throw e2;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training", "exercises", plan.id] });
      qc.invalidateQueries({ queryKey: ["training", "sets", plan.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteDay = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("training_days").delete().eq("id", day.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training", "days", plan.id] });
      qc.invalidateQueries({ queryKey: ["training", "exercises", plan.id] });
      qc.invalidateQueries({ queryKey: ["training", "sets", plan.id] });
    },
  });

  // Progreso del día basado en check de "ejercicio completado"
  const totalEx = exercises.length;
  const completedEx = exercises.filter((e) => !!e.completed_at).length;
  const pct = totalEx === 0 ? 0 : Math.round((completedEx / totalEx) * 100);
  const missingData = exercises.filter((e) => {
    const exSets = sets.filter((s) => s.exercise_id === e.id);
    return exSets.length === 0 || exSets.some((s) => s.weight === null || s.reps === null);
  }).length;

  const finishSession = useMutation({
    mutationFn: async () => {
      if (exercises.length === 0) return;
      const currentWeek = plan.current_week ?? 1;
      // Build snapshot of exercises + sets for the day
      const snapshot = exercises.map((e) => {
        const exSets = sets
          .filter((s) => s.exercise_id === e.id)
          .sort((a, b) => a.set_number - b.set_number)
          .map((s) => ({
            set_number: s.set_number,
            weight: s.weight,
            reps: s.reps,
            rir: s.rir,
          }));
        const load = exSets.reduce(
          (acc, s) => acc + (Number(s.weight) || 0) * (Number(s.reps) || 0),
          0,
        );
        return {
          order_num: e.order_num,
          muscle_group: e.muscle_group,
          exercise_name: e.exercise_name,
          programmed_sets: e.programmed_sets,
          programmed_reps: e.programmed_reps,
          sets: exSets,
          load,
        };
      });
      const total_load = snapshot.reduce((a, e) => a + e.load, 0);
      // 1) Save history row
      const { error: hErr } = await supabase.from("training_session_history").insert({
        user_id: plan.user_id,
        plan_id: plan.id,
        day_id: day.id,
        week_number: currentWeek,
        day_number: day.day_number,
        day_type: day.day_type,
        total_load,
        exercises: snapshot,
      });
      if (hErr) throw hErr;
      // 2) Clear weight & reps from all sets of this day
      const setIds = sets
        .filter((s) => exercises.some((e) => e.id === s.exercise_id))
        .map((s) => s.id);
      if (setIds.length > 0) {
        const { error: sErr } = await supabase
          .from("training_sets")
          .update({ weight: null, reps: null })
          .in("id", setIds);
        if (sErr) throw sErr;
      }
      // 3) Reset completed_at on this day's exercises
      const { error: exErr } = await supabase
        .from("training_exercises")
        .update({ completed_at: null })
        .in(
          "id",
          exercises.map((e) => e.id),
        );
      if (exErr) throw exErr;
      // 4) If all days of the current week (that have exercises) are now saved
      //    in history for this week, advance current_week.
      const daysWithEx = allDays.filter((d) => allExercises.some((e) => e.day_id === d.id));
      const { data: hist } = await supabase
        .from("training_session_history")
        .select("day_number")
        .eq("plan_id", plan.id)
        .eq("week_number", currentWeek);
      const doneDayNums = new Set((hist ?? []).map((h) => h.day_number));
      const allDone = daysWithEx.every((d) => doneDayNums.has(d.day_number));
      if (allDone) {
        const nextWeek = currentWeek + 1;
        const newWeeksCount = Math.max(plan.weeks_count, nextWeek);
        const { error: pErr } = await supabase
          .from("training_plans")
          .update({ current_week: nextWeek, weeks_count: newWeeksCount })
          .eq("id", plan.id);
        if (pErr) throw pErr;
        return { advanced: true, nextWeek };
      }
      return { advanced: false };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["training", "exercises", plan.id] });
      qc.invalidateQueries({ queryKey: ["training", "sets", plan.id] });
      qc.invalidateQueries({ queryKey: ["training", "plan"] });
      qc.invalidateQueries({ queryKey: ["training", "session-history", plan.id] });
      if (r && "advanced" in r && r.advanced) {
        toast.success(`Semana completada. Avanzas a la Semana ${r.nextWeek}.`);
      } else {
        toast.success("Sesión guardada en el reporte. Plantilla lista para la próxima.");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Manual reset of the day (progress bar back to 0 without saving)
  const resetDay = useMutation({
    mutationFn: async () => {
      if (exercises.length === 0) return;
      const setIds = sets
        .filter((s) => exercises.some((e) => e.id === s.exercise_id))
        .map((s) => s.id);
      if (setIds.length > 0) {
        const { error: sErr } = await supabase
          .from("training_sets")
          .update({ weight: null, reps: null })
          .in("id", setIds);
        if (sErr) throw sErr;
      }
      const { error: exErr } = await supabase
        .from("training_exercises")
        .update({ completed_at: null })
        .in(
          "id",
          exercises.map((e) => e.id),
        );
      if (exErr) throw exErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training", "exercises", plan.id] });
      qc.invalidateQueries({ queryKey: ["training", "sets", plan.id] });
      toast.success("Día reiniciado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      {/* Barra flotante de progreso del día */}
      {totalEx > 0 && (
        <div className="sticky top-2 z-30 mb-3 rounded-xl border bg-card/95 backdrop-blur shadow-md p-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="text-sm font-medium">
              Progreso del día {day.day_number} · Semana {plan.current_week ?? day.week_number}
            </div>
            <div className="text-sm tabular-nums">
              {completedEx}/{totalEx} ejercicios · <span className="font-semibold">{pct}%</span>
            </div>
          </div>
          <Progress value={pct} />
          {missingData > 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              Faltan datos (peso o repeticiones) en {missingData} ejercicio
              {missingData > 1 ? "s" : ""}.
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {totalEx > 0 && completedEx === totalEx && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> Listo para guardar
              </span>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (completedEx < totalEx) {
                  if (
                    !confirm(
                      "Aún hay ejercicios sin marcar. ¿Guardar la sesión igualmente en el reporte?",
                    )
                  )
                    return;
                }
                finishSession.mutate();
              }}
              disabled={finishSession.isPending || totalEx === 0}
            >
              {finishSession.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1 h-4 w-4" />
              )}
              Guardar sesión del día
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (
                  confirm(
                    "¿Reiniciar el día? Se borrarán peso, repeticiones y marcas de este día (no se guarda en el reporte).",
                  )
                ) {
                  resetDay.mutate();
                }
              }}
              disabled={resetDay.isPending || totalEx === 0}
            >
              {resetDay.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-4 w-4" />
              )}
              Reiniciar día
            </Button>
          </div>
        </div>
      )}
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">Día {day.day_number}</CardTitle>
            <Select
              value={day.day_type}
              onValueChange={(v) => updateDay.mutate({ day_type: v as DayType })}
              disabled={!isAdmin}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => addExercise.mutate()}
                disabled={addExercise.isPending}
              >
                <Plus className="mr-1 h-4 w-4" /> Ejercicio
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (confirm("¿Eliminar este día completo?")) deleteDay.mutate();
                }}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Día
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <DayExcelTable
            plan={plan}
            day={day}
            exercises={exercises}
            sets={sets}
            isAdmin={isAdmin}
            onAddExercise={() => addExercise.mutate()}
            adding={addExercise.isPending}
          />
        </CardContent>
      </Card>
    </>
  );
}

function DayExcelTable({
  plan,
  day,
  exercises,
  sets,
  isAdmin,
  onAddExercise,
  adding,
}: {
  plan: TrainingPlan;
  day: TrainingDay;
  exercises: TrainingExercise[];
  sets: TrainingSet[];
  isAdmin: boolean;
  onAddExercise: () => void;
  adding: boolean;
}) {
  const dayLoad = exercises.reduce((acc, ex) => {
    const es = sets.filter((s) => s.exercise_id === ex.id);
    return acc + es.reduce((a, s) => a + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
  }, 0);
  const totalCols = isAdmin ? 20 : 19;
  return (
    <div className="rounded-lg border overflow-x-auto bg-card">
      <table className="min-w-[1800px] w-full text-xs border-collapse">
        <thead>
          <tr className="bg-primary text-primary-foreground">
            <th rowSpan={2} className="border border-primary-foreground/30 p-1 w-10">
              #
            </th>
            <th rowSpan={2} className="border border-primary-foreground/30 p-1">
              GRUPO MUSCULAR
            </th>
            <th rowSpan={2} className="border border-primary-foreground/30 p-1">
              EJERCICIO
            </th>
            <th rowSpan={2} className="border border-primary-foreground/30 p-1">
              COMENTARIO
            </th>
            <th rowSpan={2} className="border border-primary-foreground/30 p-1">
              LINK DEL EJERCICIO
            </th>
            <th rowSpan={2} className="border border-primary-foreground/30 p-1">
              SERIES
            </th>
            <th rowSpan={2} className="border border-primary-foreground/30 p-1">
              REPS
            </th>
            <th rowSpan={2} className="border border-primary-foreground/30 p-1">
              SER. APROX.
            </th>
            <th rowSpan={2} className="border border-primary-foreground/30 p-1">
              DESCANSO (SEG)
            </th>
            {[1, 2, 3].map((n) => (
              <th
                key={n}
                colSpan={3}
                className="border border-primary-foreground/30 p-1 bg-primary/80"
              >
                SERIE {n}
              </th>
            ))}
            <th
              rowSpan={2}
              className="border border-primary-foreground/30 p-1 bg-yellow-400 text-black"
            >
              SUMA DE CARGA
            </th>
            <th rowSpan={2} className="border border-primary-foreground/30 p-1">
              COMENTARIOS DEL PACIENTE
            </th>
            {isAdmin && (
              <th rowSpan={2} className="border border-primary-foreground/30 p-1 w-10"></th>
            )}
          </tr>
          <tr className="bg-primary/70 text-primary-foreground">
            {[1, 2, 3].map((n) => (
              <Fragment key={n}>
                <th className="border border-primary-foreground/30 p-1">PESO</th>
                <th className="border border-primary-foreground/30 p-1">REPS</th>
                <th className="border border-primary-foreground/30 p-1">RIR</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {exercises.length === 0 ? (
            <tr>
              <td colSpan={totalCols} className="p-6 text-center text-muted-foreground">
                Sin ejercicios en este día.
              </td>
            </tr>
          ) : (
            exercises.map((ex) => (
              <ExcelExerciseRow
                key={ex.id}
                plan={plan}
                exercise={ex}
                sets={sets.filter((s) => s.exercise_id === ex.id)}
                isAdmin={isAdmin}
              />
            ))
          )}
          <tr className="bg-yellow-400/30 font-semibold">
            <td colSpan={isAdmin ? totalCols - 3 : totalCols - 2} className="border p-2 text-right">
              TOTAL DEL DÍA (kg·rep)
            </td>
            <td className="border p-2 text-center tabular-nums bg-yellow-400 text-black">
              {dayLoad.toLocaleString()}
            </td>
            <td className="border p-2"></td>
            {isAdmin && <td className="border p-2"></td>}
          </tr>
        </tbody>
      </table>
      {isAdmin && (
        <div className="p-2 border-t flex justify-end">
          <Button size="sm" onClick={onAddExercise} disabled={adding}>
            <Plus className="mr-1 h-4 w-4" /> Agregar ejercicio
          </Button>
        </div>
      )}
    </div>
  );
}

function ExcelExerciseRow({
  plan,
  exercise,
  sets,
  isAdmin,
}: {
  plan: TrainingPlan;
  exercise: TrainingExercise;
  sets: TrainingSet[];
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [local, setLocal] = useState(exercise);
  useEffect(() => {
    setLocal(exercise);
  }, [exercise.id]);

  useDebouncedEffect(() => {
    if (!isAdmin) return;
    const changed =
      local.order_num !== exercise.order_num ||
      (local.muscle_group ?? "") !== (exercise.muscle_group ?? "") ||
      local.exercise_name !== exercise.exercise_name ||
      (local.comment ?? "") !== (exercise.comment ?? "") ||
      (local.video_url ?? "") !== (exercise.video_url ?? "") ||
      local.programmed_sets !== exercise.programmed_sets ||
      (local.programmed_reps ?? "") !== (exercise.programmed_reps ?? "") ||
      local.warmup_sets !== exercise.warmup_sets ||
      (local.rest_seconds ?? null) !== (exercise.rest_seconds ?? null);
    if (!changed) return;
    supabase
      .from("training_exercises")
      .update({
        order_num: local.order_num,
        muscle_group: local.muscle_group,
        exercise_name: local.exercise_name,
        comment: local.comment,
        video_url: local.video_url,
        programmed_sets: local.programmed_sets,
        programmed_reps: local.programmed_reps,
        warmup_sets: local.warmup_sets,
        rest_seconds: local.rest_seconds,
      })
      .eq("id", exercise.id)
      .then(({ error }) => {
        if (error) {
          toast.error(error.message);
          return;
        }
        qc.invalidateQueries({ queryKey: ["training", "exercises", plan.id] });
      });
  }, [
    local.order_num,
    local.muscle_group,
    local.exercise_name,
    local.comment,
    local.video_url,
    local.programmed_sets,
    local.programmed_reps,
    local.warmup_sets,
    local.rest_seconds,
  ]);

  useDebouncedEffect(() => {
    if ((local.patient_comment ?? "") === (exercise.patient_comment ?? "")) return;
    supabase
      .from("training_exercises")
      .update({ patient_comment: local.patient_comment ?? "" })
      .eq("id", exercise.id)
      .then(({ error }) => {
        if (error) {
          toast.error(error.message);
          return;
        }
        qc.invalidateQueries({ queryKey: ["training", "exercises", plan.id] });
      });
  }, [local.patient_comment]);

  const deleteEx = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("training_exercises").delete().eq("id", exercise.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training", "exercises", plan.id] });
      qc.invalidateQueries({ queryKey: ["training", "sets", plan.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setBy = new Map<number, TrainingSet>();
  sets.forEach((s) => setBy.set(s.set_number, s));
  const load = sets.reduce((a, s) => a + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);

  const opts = (local.muscle_group && EXERCISE_CATALOG[local.muscle_group]) || [];
  const isCustom = !!local.exercise_name && !opts.includes(local.exercise_name);

  return (
    <tr className="border-t hover:bg-muted/30">
      <td className="border p-1 text-center">
        {isAdmin ? (
          <Input
            type="number"
            className="h-8 w-12 text-xs text-center"
            value={local.order_num}
            onChange={(e) => setLocal({ ...local, order_num: Number(e.target.value) })}
          />
        ) : (
          local.order_num
        )}
      </td>
      <td className="border p-1 min-w-[150px]">
        {isAdmin ? (
          <Select
            value={local.muscle_group ?? ""}
            onValueChange={(v) => setLocal({ ...local, muscle_group: v, exercise_name: "" })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {MUSCLE_GROUPS.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs">{local.muscle_group}</span>
        )}
      </td>
      <td className="border p-1 min-w-[220px]">
        {isAdmin ? (
          <div className="space-y-1">
            <Select
              value={isCustom ? "__custom__" : local.exercise_name}
              onValueChange={(v) =>
                v === "__custom__"
                  ? setLocal({ ...local, exercise_name: local.exercise_name || "" })
                  : setLocal({ ...local, exercise_name: v })
              }
              disabled={!local.muscle_group}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue
                  placeholder={local.muscle_group ? "Elegir ejercicio" : "Elige grupo primero"}
                />
              </SelectTrigger>
              <SelectContent>
                {opts.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Otro (personalizado)…</SelectItem>
              </SelectContent>
            </Select>
            {isCustom && (
              <Input
                className="h-7 text-xs"
                value={local.exercise_name}
                onChange={(e) => setLocal({ ...local, exercise_name: e.target.value })}
              />
            )}
          </div>
        ) : (
          <span className="text-xs">{local.exercise_name}</span>
        )}
      </td>
      <td className="border p-1 min-w-[160px]">
        <Input
          className="h-8 text-xs"
          value={local.comment ?? ""}
          disabled={!isAdmin}
          onChange={(e) => setLocal({ ...local, comment: e.target.value })}
        />
      </td>
      <td className="border p-1 min-w-[160px]">
        <div className="flex gap-1">
          <Input
            className="h-8 text-xs flex-1"
            placeholder="https://..."
            value={local.video_url ?? ""}
            disabled={!isAdmin}
            onChange={(e) => setLocal({ ...local, video_url: e.target.value })}
          />
          {exercise.video_url && (
            <a
              href={exercise.video_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-1 border rounded hover:bg-accent"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </td>
      <td className="border p-1">
        <Input
          type="number"
          className="h-8 w-14 text-xs text-center"
          value={local.programmed_sets}
          disabled={!isAdmin}
          onChange={(e) => setLocal({ ...local, programmed_sets: Number(e.target.value) })}
        />
      </td>
      <td className="border p-1">
        <Input
          className="h-8 w-16 text-xs text-center"
          value={local.programmed_reps ?? ""}
          placeholder="8-10"
          disabled={!isAdmin}
          onChange={(e) => setLocal({ ...local, programmed_reps: e.target.value })}
        />
      </td>
      <td className="border p-1">
        <Input
          type="number"
          className="h-8 w-14 text-xs text-center"
          value={local.warmup_sets}
          disabled={!isAdmin}
          onChange={(e) => setLocal({ ...local, warmup_sets: Number(e.target.value) })}
        />
      </td>
      <td className="border p-1">
        <Input
          type="number"
          className="h-8 w-16 text-xs text-center"
          value={local.rest_seconds ?? ""}
          disabled={!isAdmin}
          onChange={(e) =>
            setLocal({ ...local, rest_seconds: e.target.value ? Number(e.target.value) : null })
          }
        />
      </td>
      {[1, 2, 3].map((n) => (
        <ExcelSetCells
          key={n}
          planId={plan.id}
          exerciseId={exercise.id}
          setNumber={n}
          set={setBy.get(n)}
          isAdmin={isAdmin}
        />
      ))}
      <td className="border p-1 text-center tabular-nums bg-yellow-400/20 font-semibold">
        {load.toLocaleString()}
      </td>
      <td className="border p-1 min-w-[200px]">
        <Textarea
          rows={2}
          className="text-xs min-h-[40px]"
          value={local.patient_comment ?? ""}
          placeholder="Sensación, dolor, técnica…"
          onChange={(e) => setLocal({ ...local, patient_comment: e.target.value })}
        />
      </td>
      {isAdmin && (
        <td className="border p-1 text-center">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => {
              if (confirm("¿Eliminar ejercicio?")) deleteEx.mutate();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </td>
      )}
    </tr>
  );
}

function ExcelSetCells({
  planId,
  exerciseId,
  setNumber,
  set,
  isAdmin,
}: {
  planId: string;
  exerciseId: string;
  setNumber: number;
  set: TrainingSet | undefined;
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [weight, setWeight] = useState<string>(set?.weight?.toString() ?? "");
  const [reps, setReps] = useState<string>(set?.reps?.toString() ?? "");
  const [rir, setRir] = useState<string>(set?.rir?.toString() ?? "");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setWeight(set?.weight?.toString() ?? "");
    setReps(set?.reps?.toString() ?? "");
    setRir(set?.rir?.toString() ?? "");
    setDirty(false);
  }, [set?.id, set?.weight, set?.reps, set?.rir]);

  const save = async () => {
    if (!dirty) return;
    setDirty(false);
    const patch: Partial<TrainingSet> = {
      weight: weight === "" ? null : Number(weight),
      reps: reps === "" ? null : Number(reps),
    };
    if (isAdmin) patch.rir = rir === "" ? null : rir;
    if (set) {
      const { error } = await supabase.from("training_sets").update(patch).eq("id", set.id);
      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("training_sets").insert({
        exercise_id: exerciseId,
        set_number: setNumber,
        ...patch,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    qc.invalidateQueries({ queryKey: ["training", "sets", planId] });
  };

  const programmed = rir.trim() !== "";
  const complete = programmed && weight !== "" && reps !== "";
  const incomplete = programmed && !complete;
  const cellClass = complete
    ? "border p-0.5 bg-emerald-500/15"
    : incomplete
      ? "border p-0.5 bg-rose-500/15"
      : "border p-0.5";
  const lockPatient = !isAdmin && !programmed;

  return (
    <>
      <td className={cellClass}>
        <Input
          type="number"
          step="0.5"
          className="h-8 w-16 text-xs text-center"
          value={weight}
          disabled={lockPatient}
          title={lockPatient ? "El nutricionista aún no ha programado esta serie (RIR)" : undefined}
          onChange={(e) => {
            setWeight(e.target.value);
            setDirty(true);
          }}
          onBlur={save}
        />
      </td>
      <td className={cellClass}>
        <Input
          type="number"
          className="h-8 w-14 text-xs text-center"
          value={reps}
          disabled={lockPatient}
          title={lockPatient ? "El nutricionista aún no ha programado esta serie (RIR)" : undefined}
          onChange={(e) => {
            setReps(e.target.value);
            setDirty(true);
          }}
          onBlur={save}
        />
      </td>
      <td className={cellClass}>
        <Input
          className="h-8 w-14 text-xs text-center"
          placeholder="0-5,F,P"
          value={rir}
          disabled={!isAdmin}
          onChange={(e) => {
            const v = e.target.value.toUpperCase();
            if (v === "" || v === "F" || v === "P" || /^\d+$/.test(v)) {
              setRir(v);
              setDirty(true);
            }
          }}
          onBlur={save}
        />
      </td>
    </>
  );
}

function ExerciseCard({
  plan,
  day,
  allDays,
  exercise,
  allExercises,
  sets,
  allSets,
  isAdmin,
}: {
  plan: TrainingPlan;
  day: TrainingDay;
  allDays: TrainingDay[];
  exercise: TrainingExercise;
  allExercises: TrainingExercise[];
  sets: TrainingSet[];
  allSets: TrainingSet[];
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [local, setLocal] = useState(exercise);
  const [exStatus, setExStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [commentStatus, setCommentStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    setLocal(exercise);
  }, [exercise.id]);

  useDebouncedEffect(() => {
    if (!isAdmin) return;
    const changed =
      local.order_num !== exercise.order_num ||
      (local.muscle_group ?? "") !== (exercise.muscle_group ?? "") ||
      local.exercise_name !== exercise.exercise_name ||
      (local.comment ?? "") !== (exercise.comment ?? "") ||
      (local.video_url ?? "") !== (exercise.video_url ?? "") ||
      local.programmed_sets !== exercise.programmed_sets ||
      (local.programmed_reps ?? "") !== (exercise.programmed_reps ?? "") ||
      local.warmup_sets !== exercise.warmup_sets ||
      (local.rest_seconds ?? null) !== (exercise.rest_seconds ?? null);
    if (!changed) return;
    setExStatus("saving");
    supabase
      .from("training_exercises")
      .update({
        order_num: local.order_num,
        muscle_group: local.muscle_group,
        exercise_name: local.exercise_name,
        comment: local.comment,
        video_url: local.video_url,
        programmed_sets: local.programmed_sets,
        programmed_reps: local.programmed_reps,
        warmup_sets: local.warmup_sets,
        rest_seconds: local.rest_seconds,
      })
      .eq("id", exercise.id)
      .then(({ error }) => {
        if (error) {
          setExStatus("error");
          toast.error(error.message);
          return;
        }
        setExStatus("saved");
        qc.invalidateQueries({ queryKey: ["training", "exercises", plan.id] });
        setTimeout(() => setExStatus("idle"), 1500);
      });
  }, [
    local.order_num,
    local.muscle_group,
    local.exercise_name,
    local.comment,
    local.video_url,
    local.programmed_sets,
    local.programmed_reps,
    local.warmup_sets,
    local.rest_seconds,
  ]);

  useDebouncedEffect(() => {
    if ((local.patient_comment ?? "") === (exercise.patient_comment ?? "")) return;
    setCommentStatus("saving");
    supabase
      .from("training_exercises")
      .update({ patient_comment: local.patient_comment ?? "" })
      .eq("id", exercise.id)
      .then(({ error }) => {
        if (error) {
          setCommentStatus("error");
          toast.error(error.message);
          return;
        }
        setCommentStatus("saved");
        qc.invalidateQueries({ queryKey: ["training", "exercises", plan.id] });
        setTimeout(() => setCommentStatus("idle"), 1500);
      });
  }, [local.patient_comment]);

  const deleteEx = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("training_exercises").delete().eq("id", exercise.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training", "exercises", plan.id] });
      qc.invalidateQueries({ queryKey: ["training", "sets", plan.id] });
    },
  });

  const addSet = useMutation({
    mutationFn: async () => {
      if (sets.length >= 3) throw new Error("Máximo 3 series");
      const next = (sets[sets.length - 1]?.set_number ?? 0) + 1;
      const { error } = await supabase
        .from("training_sets")
        .insert({ exercise_id: exercise.id, set_number: next });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training", "sets", plan.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeSet = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("training_sets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training", "sets", plan.id] }),
  });

  // Current load
  const currentLoad = sets.reduce(
    (acc, s) => acc + (Number(s.weight) || 0) * (Number(s.reps) || 0),
    0,
  );

  // Previous week same day + same order_num + same exercise_name matching
  const prevWeekDay = allDays.find(
    (d) => d.week_number === day.week_number - 1 && d.day_number === day.day_number,
  );
  const prevEx = prevWeekDay
    ? allExercises.find((e) => e.day_id === prevWeekDay.id && e.order_num === exercise.order_num)
    : null;
  const prevSets = prevEx ? allSets.filter((s) => s.exercise_id === prevEx.id) : [];
  const prevLoad = prevSets.reduce(
    (acc, s) => acc + (Number(s.weight) || 0) * (Number(s.reps) || 0),
    0,
  );
  const loadColor =
    prevLoad === 0
      ? "bg-muted"
      : currentLoad > prevLoad
        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
        : currentLoad < prevLoad
          ? "bg-red-500/15 text-red-700 dark:text-red-300"
          : "bg-amber-500/15 text-amber-700 dark:text-amber-300";

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">Ejercicio #{exercise.order_num}</div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <SaveIndicator status={exStatus} />
            <span className="text-xs text-muted-foreground">
              {exStatus === "saving"
                ? "Guardando…"
                : exStatus === "saved"
                  ? "Guardado"
                  : "Guardado automático"}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (confirm("¿Eliminar ejercicio?")) deleteEx.mutate();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-12">
        <div className="md:col-span-1">
          <Label className="text-xs">N°</Label>
          <Input
            type="number"
            value={local.order_num}
            onChange={(e) => setLocal({ ...local, order_num: Number(e.target.value) })}
            disabled={!isAdmin}
          />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Grupo muscular</Label>
          {isAdmin ? (
            <Select
              value={local.muscle_group ?? ""}
              onValueChange={(v) => setLocal({ ...local, muscle_group: v, exercise_name: "" })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Elegir grupo" />
              </SelectTrigger>
              <SelectContent>
                {MUSCLE_GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={local.muscle_group ?? ""} disabled />
          )}
        </div>
        <div className="md:col-span-3">
          <Label className="text-xs">Ejercicio</Label>
          {isAdmin ? (
            (() => {
              const opts = (local.muscle_group && EXERCISE_CATALOG[local.muscle_group]) || [];
              const isCustom = !!local.exercise_name && !opts.includes(local.exercise_name);
              return (
                <div className="space-y-1">
                  <Select
                    value={isCustom ? "__custom__" : local.exercise_name}
                    onValueChange={(v) => {
                      if (v === "__custom__")
                        setLocal({ ...local, exercise_name: local.exercise_name || "" });
                      else setLocal({ ...local, exercise_name: v });
                    }}
                    disabled={!local.muscle_group}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          local.muscle_group ? "Elegir ejercicio" : "Elige grupo muscular primero"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {opts.map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">Otro (personalizado)…</SelectItem>
                    </SelectContent>
                  </Select>
                  {isCustom && (
                    <Input
                      value={local.exercise_name}
                      placeholder="Nombre personalizado"
                      onChange={(e) => setLocal({ ...local, exercise_name: e.target.value })}
                    />
                  )}
                </div>
              );
            })()
          ) : (
            <Input value={local.exercise_name} disabled />
          )}
        </div>
        <div className="md:col-span-3">
          <Label className="text-xs">Comentario</Label>
          <Input
            value={local.comment ?? ""}
            onChange={(e) => setLocal({ ...local, comment: e.target.value })}
            disabled={!isAdmin}
          />
        </div>
        <div className="md:col-span-3">
          <Label className="text-xs">Link del video (Drive)</Label>
          <div className="flex gap-1">
            <Input
              value={local.video_url ?? ""}
              placeholder="https://drive.google.com/..."
              onChange={(e) => setLocal({ ...local, video_url: e.target.value })}
              disabled={!isAdmin}
            />
            {exercise.video_url && (
              <a
                href={exercise.video_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-md border px-2 hover:bg-accent"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <Label className="text-xs">Series prog.</Label>
          <Input
            type="number"
            value={local.programmed_sets}
            onChange={(e) => setLocal({ ...local, programmed_sets: Number(e.target.value) })}
            disabled={!isAdmin}
          />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Repeticiones</Label>
          <Input
            value={local.programmed_reps ?? ""}
            placeholder="8-10"
            onChange={(e) => setLocal({ ...local, programmed_reps: e.target.value })}
            disabled={!isAdmin}
          />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Series aproximación</Label>
          <Input
            type="number"
            value={local.warmup_sets}
            onChange={(e) => setLocal({ ...local, warmup_sets: Number(e.target.value) })}
            disabled={!isAdmin}
          />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Descanso (seg)</Label>
          <Input
            type="number"
            value={local.rest_seconds ?? ""}
            onChange={(e) =>
              setLocal({ ...local, rest_seconds: e.target.value ? Number(e.target.value) : null })
            }
            disabled={!isAdmin}
          />
        </div>
      </div>

      {/* Sets table */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left">Serie</th>
              <th className="p-2 text-left">Peso (kg)</th>
              <th className="p-2 text-left">Reps</th>
              <th className="p-2 text-left">RIR</th>
              <th className="p-2 text-left">Peso × Reps</th>
              {isAdmin && <th className="p-2"></th>}
            </tr>
          </thead>
          <tbody>
            {sets.map((s) => (
              <SetRow
                key={s.id}
                planId={plan.id}
                set={s}
                isAdmin={isAdmin}
                onDelete={() => removeSet.mutate(s.id)}
              />
            ))}
            <tr className="bg-muted/30 font-medium">
              <td className="p-2" colSpan={4}>
                Suma de carga
              </td>
              <td className={`p-2 ${loadColor}`}>
                {currentLoad.toLocaleString()} kg·rep
                {prevLoad > 0 && (
                  <span className="ml-2 text-xs opacity-80">
                    (S{day.week_number - 1}: {prevLoad.toLocaleString()})
                  </span>
                )}
              </td>
              {isAdmin && <td></td>}
            </tr>
          </tbody>
        </table>
      </div>

      {isAdmin && sets.length < 3 && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => addSet.mutate()}
          disabled={addSet.isPending}
        >
          <Plus className="mr-1 h-4 w-4" /> Agregar serie
        </Button>
      )}

      {/* Patient comment box */}
      <div className="rounded-md border bg-muted/20 p-3">
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs font-medium">Comentario del paciente</Label>
          <div className="flex items-center gap-1">
            <SaveIndicator status={commentStatus} />
            <span className="text-[10px] text-muted-foreground">
              {commentStatus === "saving"
                ? "Guardando…"
                : commentStatus === "saved"
                  ? "Guardado"
                  : "Autoguardado"}
            </span>
          </div>
        </div>
        <Textarea
          value={local.patient_comment ?? ""}
          placeholder="Escribe aquí tu comentario sobre el ejercicio (sensación, dolor, técnica, etc.)"
          rows={2}
          className="mt-1"
          onChange={(e) => setLocal({ ...local, patient_comment: e.target.value })}
        />
      </div>
    </div>
  );
}

function SetRow({
  planId,
  set,
  isAdmin,
  onDelete,
}: {
  planId: string;
  set: TrainingSet;
  isAdmin: boolean;
  onDelete: () => void;
}) {
  const qc = useQueryClient();
  const [weight, setWeight] = useState<string>(set.weight?.toString() ?? "");
  const [reps, setReps] = useState<string>(set.reps?.toString() ?? "");
  const [rir, setRir] = useState<string>(set.rir?.toString() ?? "");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setWeight(set.weight?.toString() ?? "");
    setReps(set.reps?.toString() ?? "");
    setRir(set.rir?.toString() ?? "");
    setDirty(false);
  }, [set.id, set.weight, set.reps, set.rir]);

  const save = useMutation({
    mutationFn: async () => {
      const patch: Partial<TrainingSet> = {
        weight: weight === "" ? null : Number(weight),
        reps: reps === "" ? null : Number(reps),
      };
      if (isAdmin) patch.rir = rir === "" ? null : rir;
      const { error } = await supabase.from("training_sets").update(patch).eq("id", set.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training", "sets", planId] });
      setDirty(false);
      toast.success("Serie guardada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Auto-save on blur when dirty
  const onBlur = () => {
    if (dirty) save.mutate();
  };

  const total = (Number(weight) || 0) * (Number(reps) || 0);

  return (
    <tr className="border-t">
      <td className="p-2">Serie {set.set_number}</td>
      <td className="p-2">
        <Input
          type="number"
          step="0.5"
          value={weight}
          className="h-8 w-24"
          onChange={(e) => {
            setWeight(e.target.value);
            setDirty(true);
          }}
          onBlur={onBlur}
        />
      </td>
      <td className="p-2">
        <Input
          type="number"
          value={reps}
          className="h-8 w-20"
          onChange={(e) => {
            setReps(e.target.value);
            setDirty(true);
          }}
          onBlur={onBlur}
        />
      </td>
      <td className="p-2">
        <Input
          type="text"
          value={rir}
          className="h-8 w-20"
          placeholder="0-5, F, P"
          disabled={!isAdmin}
          onChange={(e) => {
            const v = e.target.value.toUpperCase();
            if (v === "" || v === "F" || v === "P" || /^\d+$/.test(v)) {
              setRir(v);
              setDirty(true);
            }
          }}
          onBlur={onBlur}
        />
      </td>
      <td className="p-2">{total.toLocaleString()}</td>
      {isAdmin && (
        <td className="p-2">
          <Button size="icon" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </td>
      )}
    </tr>
  );
}

function SessionReport({
  plan,
  days,
  exercises,
  weeks: planWeeks,
}: {
  plan: TrainingPlan;
  days: TrainingDay[];
  exercises: TrainingExercise[];
  sets: TrainingSet[];
  weeks: number[];
}) {
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["training", "profile", plan.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,email,sport,goal")
        .eq("id", plan.user_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: history } = useQuery({
    queryKey: ["training", "session-history", plan.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_session_history")
        .select("*")
        .eq("plan_id", plan.id)
        .order("week_number", { ascending: true })
        .order("day_number", { ascending: true })
        .order("completed_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("training_session_history").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training", "session-history", plan.id] });
      toast.success("Entrada eliminada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Aggregate history per week (from saved sessions)
  const historyByWeek = useMemo(() => {
    const m = new Map<number, { load: number; days: Set<number>; count: number }>();
    for (const h of history ?? []) {
      const entry = m.get(h.week_number) ?? { load: 0, days: new Set<number>(), count: 0 };
      entry.load += Number(h.total_load) || 0;
      entry.days.add(h.day_number);
      entry.count += 1;
      m.set(h.week_number, entry);
    }
    return m;
  }, [history]);

  // Enlazado a la "Duración (semanas)" del mesociclo: mostramos exactamente
  // las semanas programadas por el administrador/nutricionista.
  const weeksToShow = useMemo(() => [...planWeeks].sort((a, b) => a - b), [planWeeks]);

  const plannedDaysCount = useMemo(() => {
    const configured = plan.days_per_week ?? null;
    if (configured && configured > 0) return Math.min(7, configured);
    return days.filter((d) => exercises.some((e) => e.day_id === d.id)).length;
  }, [days, exercises, plan.days_per_week]);

  // Comparativo día a día entre semanas: por cada día (Día 1, 2, ...), matriz ejercicio × semana con colores.
  const dayByDay = useMemo(() => {
    // Map<day_number, Map<week_number, { total_load, exercises: Map<exName, load> }>>
    const byDay = new Map<
      number,
      Map<number, { total: number; exMap: Map<string, number>; completed_at: string }>
    >();
    for (const h of history ?? []) {
      const exArr = Array.isArray(h.exercises) ? h.exercises : [];
      const exMap = new Map<string, number>();
      for (const e of exArr as Array<{
        exercise_name?: string;
        order_num?: number;
        load?: number;
      }>) {
        const key = `${e.order_num ?? 0}·${e.exercise_name ?? ""}`;
        exMap.set(key, (exMap.get(key) ?? 0) + (Number(e.load) || 0));
      }
      if (!byDay.has(h.day_number)) byDay.set(h.day_number, new Map());
      const wm = byDay.get(h.day_number)!;
      const existing = wm.get(h.week_number);
      // If duplicates same week/day, keep the latest by completed_at
      if (!existing || new Date(h.completed_at) > new Date(existing.completed_at)) {
        wm.set(h.week_number, {
          total: Number(h.total_load) || 0,
          exMap,
          completed_at: h.completed_at,
        });
      }
    }
    return byDay;
  }, [history]);

  const cellClass = (curr: number, prev: number | null) => {
    if (prev === null) return "";
    if (curr > prev) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    if (curr < prev) return "bg-red-500/15 text-red-700 dark:text-red-300";
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  };

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  async function downloadReportPdf() {
    try {
      setDownloadingPdf(true);
      const logoDataUrl = await fetchLogoDataUrl(logoAsset.url);
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Header
      const headerY = 30;
      const logoSize = 44;
      doc.setFillColor(30, 50, 17);
      doc.roundedRect(40, headerY, logoSize, logoSize, 6, 6, "F");
      doc.addImage(logoDataUrl, "PNG", 44, headerY + 4, logoSize - 8, logoSize - 8);
      doc.setTextColor(20, 20, 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Lic. Diego Rivera", 40 + logoSize + 12, headerY + 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      doc.text("Nutricionista Deportivo", 40 + logoSize + 12, headerY + 36);

      doc.setTextColor(20, 20, 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Plan de entrenamiento", pageW / 2, headerY + 28, { align: "center" });

      // Patient & plan info
      let y = headerY + logoSize + 20;
      doc.setDrawColor(220, 220, 220);
      doc.line(40, y - 8, pageW - 40, y - 8);
      const patientName = profile?.full_name?.trim() || "—";
      const sport = profile?.sport?.trim() || "—";
      const goal = profile?.goal?.trim() || "—";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Paciente:", 40, y + 8);
      doc.setFont("helvetica", "normal");
      doc.text(patientName, 110, y + 8);
      doc.setFont("helvetica", "bold");
      doc.text("Deporte:", 40, y + 26);
      doc.setFont("helvetica", "normal");
      doc.text(sport, 110, y + 26);
      doc.setFont("helvetica", "bold");
      doc.text("Objetivo:", 40, y + 44);
      doc.setFont("helvetica", "normal");
      const goalLines = doc.splitTextToSize(goal, pageW / 2 - 110);
      doc.text(goalLines, 110, y + 44);

      // Right column: plan info
      const rx = pageW / 2 + 20;
      doc.setFont("helvetica", "bold");
      doc.text("Plan:", rx, y + 8);
      doc.setFont("helvetica", "normal");
      doc.text(plan.title || "—", rx + 70, y + 8);
      doc.setFont("helvetica", "bold");
      doc.text("Duración:", rx, y + 26);
      doc.setFont("helvetica", "normal");
      doc.text(`${plan.weeks_count} semanas`, rx + 70, y + 26);
      doc.setFont("helvetica", "bold");
      doc.text("Días/semana:", rx, y + 44);
      doc.setFont("helvetica", "normal");
      doc.text(`${plannedDaysCount}`, rx + 90, y + 44);
      doc.setFont("helvetica", "bold");
      doc.text("Inicio:", rx, y + 62);
      doc.setFont("helvetica", "normal");
      doc.text(plan.start_date ?? "—", rx + 70, y + 62);

      let cursorY = y + 44 + Math.max(24, goalLines.length * 12) + 12;
      cursorY = Math.max(cursorY, y + 62 + 20);

      // Section: Comparativo semana a semana
      cursorY = drawSectionBar(doc, "Comparativo semana a semana", cursorY, [30, 50, 17]);
      const weekHead = [
        ["Semana", "Días programados", "Días guardados", "Carga total (kg·rep)", "Δ vs anterior"],
      ];
      const weekBody = weeksToShow.map((w) => {
        const entry = historyByWeek.get(w);
        const load = entry?.load ?? 0;
        const daysDone = entry?.days.size ?? 0;
        const prev = w > 1 ? (historyByWeek.get(w - 1)?.load ?? 0) : 0;
        const delta = load - prev;
        const deltaStr =
          prev === 0 || load === 0
            ? "—"
            : `${delta > 0 ? "▲ +" : delta < 0 ? "▼ " : "= "}${Math.abs(delta).toLocaleString()}`;
        return [
          `Semana ${w}`,
          `${plannedDaysCount}`,
          `${daysDone}/${plannedDaysCount}`,
          load.toLocaleString(),
          deltaStr,
        ];
      });
      autoTable(doc, {
        startY: cursorY,
        head: weekHead,
        body: weekBody,
        styles: { fontSize: 9, cellPadding: 5, textColor: [30, 30, 30] },
        headStyles: {
          fillColor: [30, 50, 17],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        bodyStyles: { halign: "center" },
        columnStyles: { 0: { halign: "left", fontStyle: "bold" } },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        margin: { left: 40, right: 40, bottom: 60 },
        theme: "grid",
        didParseCell: (data) => {
          if (data.section !== "body" || data.column.index !== 4) return;
          const raw = String(data.cell.raw ?? "");
          if (raw.startsWith("▲")) data.cell.styles.textColor = [21, 128, 61];
          else if (raw.startsWith("▼")) data.cell.styles.textColor = [185, 28, 28];
          else if (raw.startsWith("=")) data.cell.styles.textColor = [161, 98, 7];
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cursorY = (doc as any).lastAutoTable.finalY + 18;

      // Section: Comparativo día a día
      const dayNums = Array.from(dayByDay.keys()).sort((a, b) => a - b);
      for (const dayNum of dayNums) {
        const wm = dayByDay.get(dayNum)!;
        const weeksSorted = Array.from(wm.keys()).sort((a, b) => a - b);
        const exKeys = new Set<string>();
        for (const w of weeksSorted) for (const k of wm.get(w)!.exMap.keys()) exKeys.add(k);
        const exKeysArr = Array.from(exKeys).sort((a, b) => {
          const ao = Number(a.split("·")[0]) || 0;
          const bo = Number(b.split("·")[0]) || 0;
          return ao - bo;
        });

        if (cursorY > pageH - 140) {
          doc.addPage();
          cursorY = 40;
        }
        cursorY = drawSectionBar(
          doc,
          `Día ${dayNum} — comparativo entre semanas`,
          cursorY,
          [30, 50, 17],
        );

        const head = [["Ejercicio", ...weeksSorted.map((w) => `Sem ${w}`)]];
        const body: (string | number)[][] = exKeysArr.map((k) => {
          const name = k.split("·").slice(1).join("·") || "—";
          const cells = weeksSorted.map((w, idx) => {
            const curr = wm.get(w)!.exMap.get(k) ?? 0;
            const prevW = idx > 0 ? weeksSorted[idx - 1] : null;
            const prev = prevW !== null ? (wm.get(prevW)!.exMap.get(k) ?? 0) : null;
            if (!curr) return "—";
            if (prev === null) return curr.toLocaleString();
            const arrow = curr > prev ? " ▲" : curr < prev ? " ▼" : " =";
            return `${curr.toLocaleString()}${arrow}`;
          });
          return [name, ...cells];
        });
        // Total row
        const totalRow: (string | number)[] = ["Total del día"];
        weeksSorted.forEach((w, idx) => {
          const curr = wm.get(w)!.total;
          const prevW = idx > 0 ? weeksSorted[idx - 1] : null;
          const prev = prevW !== null ? wm.get(prevW)!.total : null;
          const arrow = prev === null ? "" : curr > prev ? " ▲" : curr < prev ? " ▼" : " =";
          totalRow.push(`${curr.toLocaleString()}${arrow}`);
        });
        body.push(totalRow);

        autoTable(doc, {
          startY: cursorY,
          head,
          body,
          styles: { fontSize: 9, cellPadding: 5, textColor: [30, 30, 30] },
          headStyles: {
            fillColor: [30, 50, 17],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "center",
          },
          bodyStyles: { halign: "center" },
          columnStyles: { 0: { halign: "left", fontStyle: "bold", cellWidth: 200 } },
          alternateRowStyles: { fillColor: [248, 248, 248] },
          margin: { left: 40, right: 40, bottom: 60 },
          theme: "grid",
          didParseCell: (data) => {
            if (data.section !== "body" || data.column.index === 0) return;
            const raw = String(data.cell.raw ?? "");
            if (raw.includes("▲")) {
              data.cell.styles.fillColor = [220, 252, 231];
              data.cell.styles.textColor = [21, 128, 61];
            } else if (raw.includes("▼")) {
              data.cell.styles.fillColor = [254, 226, 226];
              data.cell.styles.textColor = [185, 28, 28];
            } else if (raw.includes("=")) {
              data.cell.styles.fillColor = [254, 249, 195];
              data.cell.styles.textColor = [161, 98, 7];
            }
            if (data.row.index === body.length - 1) {
              data.cell.styles.fontStyle = "bold";
            }
          },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cursorY = (doc as any).lastAutoTable.finalY + 18;
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(220, 220, 220);
        doc.line(40, pageH - 40, pageW - 40, pageH - 40);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(30, 50, 17);
        doc.text("Lic. Diego Rivera", pageW - 40, pageH - 26, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(90, 90, 90);
        doc.text("Nutricionista Deportivo", pageW - 40, pageH - 14, { align: "right" });
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${i} de ${pageCount}`, 40, pageH - 18);
      }

      const safeName = (patientName || "paciente").replace(/[^\p{L}\p{N}\-_]+/gu, "_");
      const today = new Date().toISOString().slice(0, 10);
      doc.save(`reporte-entrenamiento-${safeName}-${today}.pdf`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo generar el PDF";
      toast.error(msg);
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={downloadReportPdf} disabled={downloadingPdf} variant="outline" size="sm">
          {downloadingPdf ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Descargar PDF
        </Button>
      </div>
      {/* Comparativo semana a semana desde el historial guardado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparativo semana a semana</CardTitle>
          <CardDescription>
            Carga total y días completados según las sesiones guardadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left">Semana</th>
                <th className="p-2 text-center">Días programados</th>
                <th className="p-2 text-center">Progreso</th>
                <th className="p-2 text-center">Carga total (kg·rep)</th>
                <th className="p-2 text-center">Δ vs sem. anterior</th>
              </tr>
            </thead>
            <tbody>
              {weeksToShow.map((w) => {
                const entry = historyByWeek.get(w);
                const load = entry?.load ?? 0;
                const daysDone = entry?.days.size ?? 0;
                const pct =
                  plannedDaysCount === 0
                    ? 0
                    : Math.min(100, Math.round((daysDone / plannedDaysCount) * 100));
                const prev = w > 1 ? (historyByWeek.get(w - 1)?.load ?? 0) : 0;
                const delta = load - prev;
                const deltaColor =
                  prev === 0 || load === 0
                    ? "text-muted-foreground"
                    : delta > 0
                      ? "text-emerald-700 dark:text-emerald-300"
                      : delta < 0
                        ? "text-red-700 dark:text-red-300"
                        : "text-amber-700 dark:text-amber-300";
                return (
                  <tr
                    key={w}
                    className={`border-t ${w === (plan.current_week ?? 1) ? "bg-primary/5" : ""}`}
                  >
                    <td className="p-2 font-medium">
                      Semana {w}
                      {w === (plan.current_week ?? 1) && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          actual
                        </Badge>
                      )}
                    </td>
                    <td className="p-2 text-center">{plannedDaysCount}</td>
                    <td className="p-2 text-center">
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="tabular-nums text-xs w-10 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="p-2 text-center tabular-nums">{load.toLocaleString()}</td>
                    <td className={`p-2 text-center tabular-nums ${deltaColor}`}>
                      {prev === 0 || load === 0
                        ? "—"
                        : `${delta > 0 ? "▲ +" : delta < 0 ? "▼ " : "= "}${Math.abs(delta).toLocaleString()}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Comparativo día a día entre semanas */}
      {Array.from(dayByDay.keys())
        .sort((a, b) => a - b)
        .map((dayNum) => {
          const wm = dayByDay.get(dayNum)!;
          const weeksSorted = Array.from(wm.keys()).sort((a, b) => a - b);
          // Union de todos los ejercicios registrados en ese día en cualquier semana
          const exKeys = new Set<string>();
          for (const w of weeksSorted) for (const k of wm.get(w)!.exMap.keys()) exKeys.add(k);
          const exKeysArr = Array.from(exKeys).sort((a, b) => {
            const ao = Number(a.split("·")[0]) || 0;
            const bo = Number(b.split("·")[0]) || 0;
            return ao - bo;
          });
          return (
            <Card key={dayNum}>
              <CardHeader>
                <CardTitle className="text-base">
                  Día {dayNum} — comparativo entre semanas
                </CardTitle>
                <CardDescription>
                  Verde: subió · Rojo: bajó · Amarillo: igual (vs. semana anterior del mismo día).
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-2 text-left">Ejercicio</th>
                      {weeksSorted.map((w) => (
                        <th key={w} className="p-2 text-center">
                          Sem {w}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exKeysArr.map((k) => {
                      const name = k.split("·").slice(1).join("·") || "—";
                      return (
                        <tr key={k} className="border-t">
                          <td className="p-2 font-medium">{name}</td>
                          {weeksSorted.map((w, idx) => {
                            const curr = wm.get(w)!.exMap.get(k) ?? 0;
                            const prevW = idx > 0 ? weeksSorted[idx - 1] : null;
                            const prev = prevW !== null ? (wm.get(prevW)!.exMap.get(k) ?? 0) : null;
                            const cls = prev === null || curr === 0 ? "" : cellClass(curr, prev);
                            const arrow =
                              prev === null || curr === 0
                                ? ""
                                : curr > prev
                                  ? " ▲"
                                  : curr < prev
                                    ? " ▼"
                                    : " =";
                            return (
                              <td key={w} className={`p-2 text-center tabular-nums ${cls}`}>
                                {curr ? curr.toLocaleString() : "—"}
                                {arrow}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    <tr className="border-t bg-muted/30 font-semibold">
                      <td className="p-2">Total del día</td>
                      {weeksSorted.map((w, idx) => {
                        const curr = wm.get(w)!.total;
                        const prevW = idx > 0 ? weeksSorted[idx - 1] : null;
                        const prev = prevW !== null ? wm.get(prevW)!.total : null;
                        const cls = prev === null ? "" : cellClass(curr, prev);
                        const arrow =
                          prev === null ? "" : curr > prev ? " ▲" : curr < prev ? " ▼" : " =";
                        return (
                          <td key={w} className={`p-2 text-center tabular-nums ${cls}`}>
                            {curr.toLocaleString()}
                            {arrow}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          );
        })}

      {/* Historial detallado de sesiones guardadas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de sesiones guardadas</CardTitle>
          <CardDescription>
            Cada día completado queda registrado aquí automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {(history ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay sesiones guardadas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left">Semana</th>
                  <th className="p-2 text-left">Día</th>
                  <th className="p-2 text-center">Ejercicios</th>
                  <th className="p-2 text-center">Carga (kg·rep)</th>
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {(history ?? []).map((h) => {
                  const exArr = Array.isArray(h.exercises) ? h.exercises : [];
                  return (
                    <tr key={h.id} className="border-t">
                      <td className="p-2">S{h.week_number}</td>
                      <td className="p-2">Día {h.day_number}</td>
                      <td className="p-2 text-center">{exArr.length}</td>
                      <td className="p-2 text-center tabular-nums">
                        {Number(h.total_load).toLocaleString()}
                      </td>
                      <td className="p-2 text-muted-foreground text-xs">
                        {new Date(h.completed_at).toLocaleString()}
                      </td>
                      <td className="p-2 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("¿Eliminar esta entrada del historial?"))
                              deleteEntry.mutate(h.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
