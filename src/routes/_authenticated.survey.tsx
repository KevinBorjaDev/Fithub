import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ClipboardList,
  Loader2,
  Save,
  CheckCircle2,
  CalendarDays,
  Salad,
  Dumbbell,
  Moon,
  CircleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/survey")({
  head: () => ({
    meta: [
      { title: "Encuesta mensual — Lic. Diego Rivera" },
      {
        name: "description",
        content: "Encuesta mensual de seguimiento nutricional y de entrenamiento.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SurveyPage,
});

type AnswerKind = "scale" | "yesno" | "text";
type Question = { key: string; label: string; kind: AnswerKind; commentOnly?: boolean };
type Section = {
  id: string;
  title: string;
  icon: typeof Salad;
  color: string;
  questions: Question[];
};

const SECTIONS: Section[] = [
  {
    id: "nutrition",
    title: "Alimentación / Plan nutricional",
    icon: Salad,
    color: "hsl(142 71% 45%)",
    questions: [
      {
        key: "n1",
        label:
          "¿Has podido cumplir con el plan nutricional propuesto o has tenido dificultades para seguirlo? (del 1 al 10)",
        kind: "scale",
      },
      {
        key: "n2",
        label:
          "¿Has logrado respetar los horarios de comida y el número de comidas indicadas al día? (del 1 al 10)",
        kind: "scale",
      },
      {
        key: "n3",
        label: "¿En qué momento del día sientes más hambre?",
        kind: "text",
        commentOnly: true,
      },
      {
        key: "n4",
        label: "¿En qué momento del día sientes menos apetito o falta de hambre?",
        kind: "text",
        commentOnly: true,
      },
      {
        key: "n5",
        label: "¿Cómo describirías actualmente tu relación con la comida?",
        kind: "text",
        commentOnly: true,
      },
      {
        key: "n6",
        label: "¿Has comido entre las comidas planteadas en el plan nutricional?",
        kind: "yesno",
      },
      {
        key: "n7",
        label:
          "¿Has utilizado balanza de alimentos o tazas medidoras para cumplir con las cantidades indicadas?",
        kind: "yesno",
      },
      {
        key: "n8",
        label:
          "¿Hay algún alimento del plan que no te guste o que prefieras no incluir? (Especifica cuál o cuáles)",
        kind: "text",
        commentOnly: true,
      },
      {
        key: "n9",
        label:
          "¿Hay algún alimento que te gustaría incluir en el plan nutricional que actualmente no esté considerado? (Especifica cuál o cuáles)",
        kind: "text",
        commentOnly: true,
      },
      {
        key: "n10",
        label: "Respecto a Comida 1: ¿Has tenido alguna dificultad para cumplirla?",
        kind: "yesno",
      },
      {
        key: "n11",
        label: "Respecto a Comida 2: ¿Has tenido alguna dificultad para cumplirla?",
        kind: "yesno",
      },
      {
        key: "n12",
        label: "Respecto a Comida 3: ¿Has tenido alguna dificultad para cumplirla?",
        kind: "yesno",
      },
      {
        key: "n13",
        label: "Respecto a Comida 4: ¿Has tenido alguna dificultad para cumplirla?",
        kind: "yesno",
      },
      {
        key: "n14",
        label: "Respecto a Comida 5: ¿Has tenido alguna dificultad para cumplirla?",
        kind: "yesno",
      },
      {
        key: "n15",
        label: "¿Estás incluyendo alimentos integrales en tu alimentación?",
        kind: "yesno",
      },
      {
        key: "n16",
        label: "¿Cuánta agua estás consumiendo al día? (Especifica en vasos o litros)",
        kind: "text",
        commentOnly: true,
      },
      {
        key: "n17",
        label: "¿Has presentado molestias estomacales o digestivas? (Si es así, describe cuáles)",
        kind: "yesno",
      },
      {
        key: "n18",
        label:
          "¿Consideras que el plan nutricional se adapta adecuadamente a tu entrenamiento o actividad física?",
        kind: "yesno",
      },
      {
        key: "n19",
        label: "¿Estás consumiendo alimentos fuera de la dieta planteada? (Detalla en comentarios)",
        kind: "yesno",
      },
      {
        key: "n20",
        label:
          "¿Estás consumiendo los suplementos pautados? ¿O algún otro tipo de suplemento? (describe)",
        kind: "yesno",
      },
      {
        key: "n21",
        label:
          "Comentarios finales o información adicional que consideres importante sobre tu alimentación.",
        kind: "text",
        commentOnly: true,
      },
    ],
  },
  {
    id: "training",
    title: "Actividad pauta y entrenamientos",
    icon: Dumbbell,
    color: "hsl(217 91% 60%)",
    questions: [
      {
        key: "t1",
        label: "¿Has cumplido con el entrenamiento programado durante la semana?",
        kind: "yesno",
      },
      {
        key: "t2",
        label: "¿Has notado mejoras en tu rendimiento durante los entrenamientos?",
        kind: "yesno",
      },
      {
        key: "t3",
        label: "¿Has presentado fatiga muscular temprana durante el entrenamiento?",
        kind: "yesno",
      },
      {
        key: "t4",
        label: "¿Has tenido dificultad para recuperarte después de los entrenamientos?",
        kind: "yesno",
      },
      {
        key: "t5",
        label: "¿Qué grupo muscular sientes que te cuesta más recuperar?",
        kind: "text",
        commentOnly: true,
      },
      { key: "t6", label: "¿Te sientes motivado actualmente para entrenar?", kind: "yesno" },
      {
        key: "t7",
        label:
          "¿Has cumplido con los pasos diarios o con la bicicleta/spinning programada durante la semana?",
        kind: "yesno",
      },
      {
        key: "t8",
        label: "¿Cuántos pasos en promedio realizas al día?",
        kind: "text",
        commentOnly: true,
      },
      {
        key: "t9",
        label: "¿Presentas alguna dificultad para realizar el entrenamiento pautado?",
        kind: "yesno",
      },
      {
        key: "t10",
        label: "¿Qué ejercicios te cuesta más realizar durante tu entrenamiento?",
        kind: "text",
        commentOnly: true,
      },
      {
        key: "t11",
        label:
          "Comentarios finales o información adicional sobre tu entrenamiento y actividad física.",
        kind: "text",
        commentOnly: true,
      },
    ],
  },
  {
    id: "sleep",
    title: "Higiene de sueño y hábitos",
    icon: Moon,
    color: "hsl(280 65% 60%)",
    questions: [
      { key: "s1", label: "¿Has presentado dificultad para dormir recientemente?", kind: "yesno" },
      {
        key: "s2",
        label: "¿Cuántas horas has dormido en promedio por noche durante la última semana?",
        kind: "text",
        commentOnly: true,
      },
      {
        key: "s3",
        label: "¿Te cuesta conciliar el sueño al momento de ir a dormir?",
        kind: "yesno",
      },
      { key: "s4", label: "¿Sueles despertarte durante la noche?", kind: "yesno" },
      {
        key: "s5",
        label: "¿Te levantas para ir al baño durante la noche con frecuencia?",
        kind: "yesno",
      },
      {
        key: "s6",
        label: "¿Has presentado problemas de erección? (Solo para hombres)",
        kind: "yesno",
      },
      {
        key: "s7",
        label: "¿Has presentado irregularidades en tu ciclo menstrual? (Solo para mujeres)",
        kind: "yesno",
      },
      {
        key: "s8",
        label:
          "Comentarios finales o información adicional sobre tu descanso, sueño o hábitos diarios.",
        kind: "text",
        commentOnly: true,
      },
    ],
  },
];

export const SURVEY_SECTIONS = SECTIONS;
export type SurveyAnswers = Answers;

type AnswerValue = { value?: string | number; comment?: string };
type Answers = Record<string, AnswerValue>;

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function SurveyPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: current, isLoading } = useQuery({
    queryKey: ["monthly-survey", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await (supabase as any)
        .from("monthly_surveys")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        user_id: string;
        answers: Answers;
        completed_at: string | null;
        created_at: string;
      } | null;
    },
    enabled: !!user,
  });

  const { data: history } = useQuery({
    queryKey: ["monthly-survey-history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("monthly_surveys")
        .select("id, completed_at, created_at")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as { id: string; completed_at: string; created_at: string }[];
    },
    enabled: !!user,
  });

  // Determine active survey: if current is null, or completed_at set >30 days ago -> need new
  const now = Date.now();
  const completedAt = current?.completed_at ? new Date(current.completed_at).getTime() : null;
  const daysSinceCompletion = completedAt
    ? Math.floor((now - completedAt) / (24 * 3600 * 1000))
    : null;
  const needsNewSurvey =
    !current || (completedAt !== null && daysSinceCompletion !== null && daysSinceCompletion >= 30);
  const isLocked =
    current?.completed_at && daysSinceCompletion !== null && daysSinceCompletion < 30;
  const daysUntilNext = daysSinceCompletion !== null ? Math.max(0, 30 - daysSinceCompletion) : null;

  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const creatingRef = useRef(false);
  const surveyIdRef = useRef<string | null>(null);
  const answersRef = useRef<Answers>({});
  const initializedRef = useRef(false);
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingRef = useRef<Set<string>>(new Set());
  const [status, setStatus] = useState<
    Record<string, "idle" | "pending" | "saving" | "saved" | "error">
  >({});
  const anySaving = useMemo(
    () => Object.values(status).some((s) => s === "saving" || s === "pending"),
    [status],
  );

  useEffect(() => {
    surveyIdRef.current = surveyId;
  }, [surveyId]);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Initialize local state from server
  useEffect(() => {
    if (!user) return;
    if (isLocked && current) {
      setSurveyId(current.id);
      setAnswers(current.answers ?? {});
      initializedRef.current = true;
      return;
    }
    if (needsNewSurvey && !creatingRef.current) {
      creatingRef.current = true;
      (async () => {
        const { data, error } = await (supabase as any)
          .from("monthly_surveys")
          .insert({ user_id: user.id, answers: {} })
          .select()
          .single();
        creatingRef.current = false;
        if (error) {
          toast.error("No se pudo iniciar la encuesta");
          return;
        }
        setSurveyId(data.id);
        setAnswers({});
        initializedRef.current = true;
        queryClient.invalidateQueries({ queryKey: ["monthly-survey", user.id] });
      })();
      return;
    }
    if (current && !current.completed_at && !initializedRef.current) {
      setSurveyId(current.id);
      setAnswers(current.answers ?? {});
      initializedRef.current = true;
    }
  }, [user, current?.id, isLocked, needsNewSurvey, queryClient]);

  const flushKey = async (key: string) => {
    // Wait until the survey row exists.
    let tries = 0;
    while (!surveyIdRef.current && tries < 50) {
      await new Promise((r) => setTimeout(r, 100));
      tries++;
    }
    if (!surveyIdRef.current) {
      setStatus((s) => ({ ...s, [key]: "error" }));
      return;
    }
    setStatus((s) => ({ ...s, [key]: "saving" }));
    const snapshot = answersRef.current;
    const { error } = await (supabase as any)
      .from("monthly_surveys")
      .update({ answers: snapshot })
      .eq("id", surveyIdRef.current);
    if (error) {
      setStatus((s) => ({ ...s, [key]: "error" }));
      toast.error("Error al guardar");
      return;
    }
    pendingRef.current.delete(key);
    setStatus((s) => ({ ...s, [key]: "saved" }));
    setLastSavedAt(new Date());
  };

  const scheduleSave = (key: string) => {
    pendingRef.current.add(key);
    setStatus((s) => ({ ...s, [key]: "pending" }));
    if (debounceRefs.current[key]) clearTimeout(debounceRefs.current[key]);
    debounceRefs.current[key] = setTimeout(() => flushKey(key), 700);
  };

  const updateAnswer = (key: string, patch: Partial<AnswerValue>) => {
    setAnswers((prev) => {
      const next = { ...prev, [key]: { ...prev[key], ...patch } };
      answersRef.current = next;
      return next;
    });
    scheduleSave(key);
  };

  const saveSection = async () => {
    // Flush any pending debounced saves immediately.
    const keys = Array.from(pendingRef.current);
    keys.forEach((k) => {
      if (debounceRefs.current[k]) clearTimeout(debounceRefs.current[k]);
    });
    if (keys.length === 0) {
      toast.success("Sin cambios pendientes");
      return;
    }
    for (const k of keys) await flushKey(k);
    toast.success("Sección guardada");
  };

  const submitSurvey = async () => {
    if (!surveyIdRef.current) return;
    // Flush any pending debounced writes before locking the survey.
    const keys = Array.from(pendingRef.current);
    keys.forEach((k) => {
      if (debounceRefs.current[k]) clearTimeout(debounceRefs.current[k]);
    });
    for (const k of keys) await flushKey(k);
    const { error } = await (supabase as any)
      .from("monthly_surveys")
      .update({ answers: answersRef.current, completed_at: new Date().toISOString() })
      .eq("id", surveyIdRef.current);
    if (error) {
      toast.error("Error al finalizar la encuesta");
      return;
    }
    toast.success("¡Encuesta enviada! Podrás completar la siguiente en 30 días.");
    initializedRef.current = false;
    queryClient.invalidateQueries({ queryKey: ["monthly-survey", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["monthly-survey-history", user?.id] });
  };

  const totalQuestions = useMemo(() => SECTIONS.reduce((n, s) => n + s.questions.length, 0), []);
  const answeredCount = useMemo(
    () =>
      SECTIONS.reduce((n, s) => {
        return (
          n +
          s.questions.filter((q) => {
            const a = answers[q.key];
            if (!a) return false;
            if (q.commentOnly) return !!(a.comment && a.comment.trim());
            return a.value !== undefined && a.value !== "" && a.value !== null;
          }).length
        );
      }, 0),
    [answers],
  );

  const missingBySection = useMemo(() => {
    return SECTIONS.map((s) => {
      const missing = s.questions.filter((q) => {
        const a = answers[q.key];
        if (!a) return true;
        if (q.commentOnly) return !(a.comment && a.comment.trim());
        return a.value === undefined || a.value === "" || a.value === null;
      });
      return { section: s, missing };
    });
  }, [answers]);
  const totalMissing = missingBySection.reduce((n, x) => n + x.missing.length, 0);
  const canSubmit = totalMissing === 0;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error(`Faltan ${totalMissing} respuesta${totalMissing === 1 ? "" : "s"} por completar`);
      return;
    }
    await submitSurvey();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al panel
          </Link>
        </Button>
        {anySaving ? (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Guardando…
          </div>
        ) : lastSavedAt ? (
          <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Guardado{" "}
            {lastSavedAt.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
          </div>
        ) : null}
      </div>

      <Card style={{ boxShadow: "var(--shadow-elegant)" }}>
        <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-4">
          <div
            className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            <ClipboardList className="h-7 w-7 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-foreground">
              Encuesta mensual de seguimiento
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ayúdanos a ajustar tu plan respondiendo estas preguntas. Tus respuestas se guardan
              automáticamente.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Avance</div>
            <div className="text-2xl font-semibold text-primary">
              {answeredCount}/{totalQuestions}
            </div>
          </div>
        </CardContent>
      </Card>

      {isLocked && current?.completed_at && (
        <Card className="border-emerald-500/50 bg-emerald-500/10">
          <CardContent className="p-5 flex items-start gap-4">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-foreground">
                Encuesta enviada el {formatDate(current.completed_at)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Podrás completar tu próxima encuesta en {daysUntilNext} día
                {daysUntilNext === 1 ? "" : "s"}. Puedes revisar tus respuestas a continuación.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading || !surveyId ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Preparando encuesta…
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={SECTIONS[0].id} className="space-y-4">
          <TabsList className="w-full grid grid-cols-1 sm:grid-cols-3 h-auto">
            {SECTIONS.map((s) => (
              <TabsTrigger key={s.id} value={s.id} className="py-2.5">
                <s.icon className="h-4 w-4 mr-2" />
                <span className="truncate">{s.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {SECTIONS.map((section) => (
            <TabsContent key={section.id} value={section.id} className="space-y-4">
              <Card style={{ borderColor: section.color }}>
                <CardHeader className="border-b" style={{ background: `${section.color}12` }}>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <section.icon className="h-5 w-5" style={{ color: section.color }} />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {section.questions.map((q, idx) => (
                      <QuestionRow
                        key={q.key}
                        index={idx + 1}
                        question={q}
                        answer={answers[q.key] ?? {}}
                        disabled={!!isLocked}
                        accent={section.color}
                        status={status[q.key] ?? (answers[q.key] ? "saved" : "idle")}
                        onChange={(patch) => updateAnswer(q.key, patch)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {!isLocked && (
                <div className="flex items-center justify-end gap-3">
                  <Button variant="outline" onClick={saveSection} disabled={anySaving}>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar sección
                  </Button>
                </div>
              )}
            </TabsContent>
          ))}

          {!isLocked && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    {canSubmit
                      ? "Todo listo. Envía tu encuesta para que el nutricionista pueda revisarla."
                      : `Faltan ${totalMissing} respuesta${totalMissing === 1 ? "" : "s"} por completar antes de enviar.`}
                  </div>
                  <Button onClick={handleSubmit} disabled={anySaving || !canSubmit}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Enviar encuesta
                  </Button>
                </div>
                {!canSubmit && (
                  <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
                    {missingBySection
                      .filter((x) => x.missing.length > 0)
                      .map((x) => (
                        <div key={x.section.id}>
                          <span className="font-medium text-foreground">{x.section.title}:</span>{" "}
                          {x.missing.length} pendiente{x.missing.length === 1 ? "" : "s"}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </Tabs>
      )}

      {history && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Historial de encuestas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="text-sm text-muted-foreground flex items-center gap-2">
                  <Badge variant="outline">{formatDate(h.completed_at)}</Badge>
                  <span>Encuesta completada</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QuestionRow({
  index,
  question,
  answer,
  disabled,
  accent,
  status,
  onChange,
}: {
  index: number;
  question: Question;
  answer: AnswerValue;
  disabled: boolean;
  accent: string;
  status: "idle" | "pending" | "saving" | "saved" | "error";
  onChange: (patch: Partial<AnswerValue>) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1.2fr] gap-3 md:gap-4 p-4 md:p-5 items-start">
      <div>
        <Label className="text-sm text-foreground leading-snug flex items-start gap-2">
          <span className="text-xs font-semibold" style={{ color: accent }}>
            {index}.
          </span>
          <span className="flex-1">{question.label}</span>
          <SaveIndicator status={status} />
        </Label>
      </div>

      <div className="min-w-[160px]">
        {question.commentOnly ? (
          <div className="text-xs text-muted-foreground italic pt-2">Solo comentario</div>
        ) : question.kind === "scale" ? (
          <Select
            value={answer.value !== undefined ? String(answer.value) : ""}
            onValueChange={(v) => onChange({ value: Number(v) })}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="1 - 10" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select
            value={(answer.value as string) ?? ""}
            onValueChange={(v) => onChange({ value: v })}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Sí / No" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="si">Sí</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <Textarea
        placeholder="Comentarios…"
        value={answer.comment ?? ""}
        onChange={(e) => onChange({ comment: e.target.value })}
        disabled={disabled}
        className="min-h-[70px] resize-y"
      />
    </div>
  );
}

function SaveIndicator({ status }: { status: "idle" | "pending" | "saving" | "saved" | "error" }) {
  if (status === "saving" || status === "pending") {
    return (
      <Loader2
        className="h-4 w-4 animate-spin text-muted-foreground shrink-0"
        aria-label="Guardando"
      />
    );
  }
  if (status === "saved") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" aria-label="Guardado" />;
  }
  if (status === "error") {
    return (
      <CircleAlert className="h-4 w-4 text-destructive shrink-0" aria-label="Error al guardar" />
    );
  }
  return <span className="h-4 w-4 shrink-0" aria-hidden />;
}
