import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ruler,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Save,
  Pencil,
  X,
  LineChart as LineChartIcon,
  ClipboardList,
  Table as TableIcon,
  Download,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoAsset from "@/assets/diego-rivera-logo-new.png.asset.json";

export const Route = createFileRoute("/_authenticated/measurements")({
  head: () => ({
    meta: [
      { title: "Medidas antropométricas — Lic. Diego Rivera" },
      { name: "description", content: "Registra tus medidas corporales y visualiza tu progreso." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    patient: typeof s.patient === "string" ? s.patient : undefined,
  }),
  component: MeasurementsPage,
});

type Sex = "hombre" | "mujer";

type Row = {
  id: string;
  user_id: string;
  measurement_date: string;
  sex: Sex | null;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  // Perímetros
  p_abdominal: number | null;
  p_chest: number | null;
  p_shoulders: number | null;
  p_arm_relaxed: number | null;
  p_arm_contracted: number | null;
  p_thigh: number | null;
  p_hip: number | null;
  p_waist: number | null;
  p_calves: number | null;
  // Pliegues
  s_calves: number | null;
  s_triceps: number | null;
  s_biceps: number | null;
  s_abdominal: number | null;
  s_quadriceps: number | null;
  s_suprailiac: number | null;
  s_pectoral: number | null;
  s_axillary: number | null;
  s_supraspinal: number | null;
  s_subscapular: number | null;
  created_at: string;
  updated_at: string;
};

const PERIMETERS: { key: keyof Row; label: string }[] = [
  { key: "p_abdominal", label: "Abdominal" },
  { key: "p_chest", label: "Pecho" },
  { key: "p_shoulders", label: "Hombros" },
  { key: "p_arm_relaxed", label: "Brazo relajado" },
  { key: "p_arm_contracted", label: "Brazo contraído" },
  { key: "p_thigh", label: "Muslo" },
  { key: "p_hip", label: "Cadera" },
  { key: "p_waist", label: "Cintura" },
  { key: "p_calves", label: "Gemelos" },
];

const SKINFOLDS: { key: keyof Row; label: string }[] = [
  { key: "s_calves", label: "Gemelos" },
  { key: "s_triceps", label: "Tríceps" },
  { key: "s_biceps", label: "Bíceps" },
  { key: "s_abdominal", label: "Abdominal" },
  { key: "s_quadriceps", label: "Cuádriceps" },
  { key: "s_suprailiac", label: "Suprailíaco" },
  { key: "s_pectoral", label: "Pectoral" },
  { key: "s_axillary", label: "Axilar" },
  { key: "s_supraspinal", label: "Supraespinal" },
  { key: "s_subscapular", label: "Supraescapular" },
];

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  const p = new Date(d + "T00:00:00");
  if (Number.isNaN(p.getTime())) return "—";
  return p.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function calcBMI(w: number | null, h: number | null): number | null {
  if (!w || !h) return null;
  const m = h / 100;
  if (m <= 0) return null;
  return w / (m * m);
}

function bmiDiagnosis(bmi: number | null): { label: string; tone: string } | null {
  if (bmi == null) return null;
  if (bmi < 18.5)
    return { label: "Bajo peso", tone: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
  if (bmi < 25)
    return {
      label: "Peso normal",
      tone: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    };
  if (bmi < 30)
    return { label: "Sobrepeso", tone: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  if (bmi < 35)
    return {
      label: "Obesidad tipo 1",
      tone: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    };
  if (bmi < 40)
    return { label: "Obesidad tipo 2", tone: "bg-red-500/15 text-red-400 border-red-500/30" };
  return { label: "Obesidad tipo 3", tone: "bg-red-600/15 text-red-500 border-red-600/30" };
}

function sumSkinfolds(r: Row): number {
  return SKINFOLDS.reduce((acc, s) => acc + (Number(r[s.key]) || 0), 0);
}

// Masa grasa Faulkner: (triceps + abdominal + suprailiaco + subescapular) * 0.153 + 5.783
function faulkner(r: Row): number | null {
  const t = r.s_triceps,
    a = r.s_abdominal,
    si = r.s_suprailiac,
    sub = r.s_subscapular;
  if (t == null || a == null || si == null || sub == null) return null;
  return (t + a + si + sub) * 0.153 + 5.783;
}

// % grasa Jackson & Pollock 7 pliegues
function jacksonPollock(r: Row): number | null {
  if (!r.sex || r.age == null) return null;
  const keys: (keyof Row)[] = [
    "s_triceps",
    "s_abdominal",
    "s_quadriceps",
    "s_pectoral",
    "s_axillary",
    "s_supraspinal",
    "s_subscapular",
  ];
  const vals = keys.map((k) => r[k]);
  if (vals.some((v) => v == null)) return null;
  const sum = vals.reduce<number>((a, v) => a + (v as number), 0);
  const age = r.age;
  let density: number;
  if (r.sex === "hombre") {
    density = 1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * age;
  } else {
    density = 1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * age;
  }
  if (density <= 0) return null;
  return (4.95 / density - 4.5) * 100;
}

function MeasurementsPage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const { patient: patientParam } = Route.useSearch();
  const targetUserId = isAdmin && patientParam ? patientParam : (user?.id ?? null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["measurements", targetUserId],
    enabled: !!targetUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anthropometric_measurements")
        .select("*")
        .eq("user_id", targetUserId!)
        .order("measurement_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile-min", targetUserId],
    enabled: !!targetUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, sport, goal")
        .eq("id", targetUserId!)
        .maybeSingle();
      if (error) throw error;
      return data as { full_name: string | null; sport: string | null; goal: string | null } | null;
    },
  });

  const [openId, setOpenId] = useState<string | null>(null);
  const openRow = useMemo(() => rows.find((r) => r.id === openId) ?? null, [rows, openId]);

  const createMut = useMutation({
    mutationFn: async () => {
      if (!targetUserId) throw new Error("Sin sesión");
      const { data, error } = await supabase
        .from("anthropometric_measurements")
        .insert({ user_id: targetUserId, measurement_date: todayISO() })
        .select("*")
        .single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: (r) => {
      qc.setQueryData<Row[]>(["measurements", targetUserId], (old) => [r, ...(old ?? [])]);
      setOpenId(r.id);
      toast.success("Registro creado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("anthropometric_measurements").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.setQueryData<Row[]>(["measurements", targetUserId], (old) =>
        (old ?? []).filter((r) => r.id !== id),
      );
      if (openId === id) setOpenId(null);
      toast.success("Registro eliminado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link
            to="/dashboard"
            className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al panel
          </Link>
          <h1 className="flex items-center gap-3 text-2xl font-semibold md:text-3xl">
            <Ruler className="h-7 w-7 text-primary" /> Medidas antropométricas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registra tus medidas por fecha y visualiza tu progreso.
          </p>
        </div>
      </div>

      <Tabs defaultValue="medidas" className="w-full">
        <TabsList>
          <TabsTrigger value="medidas" className="gap-2">
            <ClipboardList className="h-4 w-4" /> Medidas
          </TabsTrigger>
          <TabsTrigger value="graficas" className="gap-2">
            <LineChartIcon className="h-4 w-4" /> Gráficas antropométricas
          </TabsTrigger>
          <TabsTrigger value="comparativo" className="gap-2">
            <TableIcon className="h-4 w-4" /> Cuadro comparativo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="medidas" className="mt-6 space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              {createMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Nuevo registro
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Aún no hay registros. Crea el primero.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {rows.map((r) => {
                const bmi = calcBMI(r.weight_kg, r.height_cm);
                const dx = bmiDiagnosis(bmi);
                return (
                  <Card
                    key={r.id}
                    className={`cursor-pointer transition hover:border-primary/50 ${openId === r.id ? "border-primary" : ""}`}
                    onClick={() => setOpenId(openId === r.id ? null : r.id)}
                  >
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline">{formatDate(r.measurement_date)}</Badge>
                        {r.weight_kg != null && (
                          <span className="text-sm">
                            Peso: <b>{r.weight_kg} kg</b>
                          </span>
                        )}
                        {bmi != null && (
                          <span className="text-sm">
                            IMC: <b>{bmi.toFixed(1)}</b>
                          </span>
                        )}
                        {dx && (
                          <Badge variant="outline" className={dx.tone}>
                            {dx.label}
                          </Badge>
                        )}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label="Eliminar medición"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar este registro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMut.mutate(r.id)}>
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {openRow && (
            <MeasurementEditor
              key={openRow.id}
              row={openRow}
              isAdmin={isAdmin}
              targetUserId={targetUserId!}
            />
          )}
        </TabsContent>

        <TabsContent value="graficas" className="mt-6">
          <ChartsView rows={rows} />
        </TabsContent>

        <TabsContent value="comparativo" className="mt-6">
          <ComparativeView rows={rows} profile={profile ?? null} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MeasurementEditor({
  row,
  isAdmin: _isAdmin,
  targetUserId,
}: {
  row: Row;
  isAdmin: boolean;
  targetUserId: string;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Row>(row);
  const [editingDate, setEditingDate] = useState(false);
  const [newDate, setNewDate] = useState(row.measurement_date);
  const { data: refMap } = useMeasurementReferences();
  const isAdmin = _isAdmin;

  useEffect(() => {
    setDraft(row);
    setNewDate(row.measurement_date);
  }, [row.id]);

  const bmi = calcBMI(draft.weight_kg, draft.height_cm);
  const dx = bmiDiagnosis(bmi);
  const sumP = sumSkinfolds(draft);
  const fat = faulkner(draft);
  const jp = jacksonPollock(draft);

  const saveMut = useMutation({
    mutationFn: async (patch: Partial<Row>) => {
      const { data, error } = await supabase
        .from("anthropometric_measurements")
        .update(patch)
        .eq("id", row.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: (r) => {
      qc.setQueryData<Row[]>(["measurements", targetUserId], (old) =>
        (old ?? []).map((x) => (x.id === r.id ? r : x)),
      );
      toast.success("Guardado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function setNum(key: keyof Row, val: string) {
    const n = val === "" ? null : Number(val);
    setDraft({ ...draft, [key]: Number.isFinite(n as number) ? (n as number) : null } as Row);
  }

  function saveAll() {
    const { id, user_id, created_at, updated_at, ...patch } = draft;
    void id;
    void user_id;
    void created_at;
    void updated_at;
    saveMut.mutate(patch);
  }

  function saveDate() {
    saveMut.mutate({ measurement_date: newDate });
    setEditingDate(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2">
          {editingDate ? (
            <>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-auto"
              />
              <Button size="sm" onClick={saveDate}>
                <Save className="mr-1 h-4 w-4" />
                Guardar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingDate(false);
                  setNewDate(row.measurement_date);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <CardTitle className="text-lg">{formatDate(draft.measurement_date)}</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setEditingDate(true)}>
                <Pencil className="h-4 w-4" /> Cambiar fecha
              </Button>
            </>
          )}
        </div>
        <Button onClick={saveAll} disabled={saveMut.isPending}>
          {saveMut.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar todo
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="generales">
          <TabsList>
            <TabsTrigger value="generales">Datos generales</TabsTrigger>
            <TabsTrigger value="perimetros">Perímetros</TabsTrigger>
            <TabsTrigger value="pliegues">Pliegues</TabsTrigger>
          </TabsList>

          <TabsContent value="generales" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Sexo</Label>
                <Select
                  value={draft.sex ?? undefined}
                  onValueChange={(v) => setDraft({ ...draft, sex: v as Sex })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hombre">Hombre</SelectItem>
                    <SelectItem value="mujer">Mujer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <NumField label="Edad (años)" value={draft.age} onChange={(v) => setNum("age", v)} />
              <NumFieldWithRef
                fieldKey="weight_kg"
                label="Peso (kg)"
                value={draft.weight_kg}
                onChange={(v) => setNum("weight_kg", v)}
                step="0.1"
                isAdmin={isAdmin}
                refMap={refMap}
              />
              <NumFieldWithRef
                fieldKey="height_cm"
                label="Talla (cm)"
                value={draft.height_cm}
                onChange={(v) => setNum("height_cm", v)}
                step="0.1"
                isAdmin={isAdmin}
                refMap={refMap}
              />
              <div className="space-y-1.5">
                <Label>IMC (auto)</Label>
                <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm">
                  {bmi != null ? bmi.toFixed(1) : "—"}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Diagnóstico IMC</Label>
                <FieldRefThumb
                  fieldKey="bmi_diagnosis"
                  label="Diagnóstico IMC"
                  isAdmin={isAdmin}
                  refMap={refMap}
                />
                <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm">
                  {dx ? (
                    <Badge variant="outline" className={dx.tone}>
                      {dx.label}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="perimetros" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {PERIMETERS.map((p) => (
                <NumFieldWithRef
                  key={p.key}
                  fieldKey={p.key as string}
                  label={`${p.label} (cm)`}
                  value={draft[p.key] as number | null}
                  onChange={(v) => setNum(p.key, v)}
                  step="0.1"
                  isAdmin={isAdmin}
                  refMap={refMap}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pliegues" className="mt-4 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {SKINFOLDS.map((s) => (
                <NumFieldWithRef
                  key={s.key}
                  fieldKey={s.key as string}
                  label={`${s.label} (mm)`}
                  value={draft[s.key] as number | null}
                  onChange={(v) => setNum(s.key, v)}
                  step="0.1"
                  isAdmin={isAdmin}
                  refMap={refMap}
                />
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatBox
                label="Sumatoria de pliegues"
                value={sumP > 0 ? sumP.toFixed(1) + " mm" : "—"}
              />
              <StatBox
                label="Masa grasa (Faulkner)"
                value={fat != null ? fat.toFixed(2) + " %" : "—"}
              />
              <StatBox label="% grasa (J&P 7)" value={jp != null ? jp.toFixed(2) + " %" : "—"} />
            </div>
            <p className="text-xs text-muted-foreground">
              Faulkner usa tríceps + abdominal + suprailíaco + supraescapular. J&P 7 requiere sexo,
              edad y los 7 pliegues (tríceps, abdominal, cuádriceps, pectoral, axilar, supraespinal,
              supraescapular).
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function NumField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number | null;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        step={step ?? "1"}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

type MeasurementRef = {
  id: string;
  field_key: string;
  storage_path: string;
  original_filename: string;
  mime_type: string | null;
};

const REF_ALLOWED_EXT_M = ["jpg", "jpeg", "png", "webp", "gif"];
const REF_MAX_MB_M = 5;

function useMeasurementReferences() {
  return useQuery({
    queryKey: ["measurement-references"],
    queryFn: async () => {
      const { data, error } = await supabase.from("measurement_references").select("*");
      if (error) throw error;
      const map = new Map<string, MeasurementRef>();
      for (const r of (data ?? []) as MeasurementRef[]) map.set(r.field_key, r);
      return map;
    },
    staleTime: 60_000,
  });
}

function FieldRefThumb({
  fieldKey,
  label,
  isAdmin,
  refMap,
}: {
  fieldKey: string;
  label: string;
  isAdmin: boolean;
  refMap: Map<string, MeasurementRef> | undefined;
}) {
  const qc = useQueryClient();
  const ref = refMap?.get(fieldKey) ?? null;
  const [url, setUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (!ref?.storage_path) {
      setUrl(undefined);
      return;
    }
    supabase.storage
      .from("measurement-references")
      .createSignedUrl(ref.storage_path, 3600)
      .then(({ data }) => {
        if (!cancelled) setUrl(data?.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [ref?.storage_path]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!REF_ALLOWED_EXT_M.includes(ext)) {
      toast.error(`Formato no permitido. Usa: ${REF_ALLOWED_EXT_M.join(", ")}.`);
      return;
    }
    if (file.size > REF_MAX_MB_M * 1024 * 1024) {
      toast.error(`Máx ${REF_MAX_MB_M} MB.`);
      return;
    }
    setUploading(true);
    try {
      const path = `${fieldKey}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("measurement-references")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      if (ref) {
        await supabase.storage.from("measurement-references").remove([ref.storage_path]);
        const { error: updErr } = await supabase
          .from("measurement_references")
          .update({
            storage_path: path,
            original_filename: file.name,
            mime_type: file.type || null,
            size_bytes: file.size,
          })
          .eq("id", ref.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase.from("measurement_references").insert({
          field_key: fieldKey,
          storage_path: path,
          original_filename: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
        });
        if (insErr) {
          await supabase.storage.from("measurement-references").remove([path]);
          throw insErr;
        }
      }
      toast.success("Referencia actualizada");
      qc.invalidateQueries({ queryKey: ["measurement-references"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const onRemove = async () => {
    if (!ref) return;
    try {
      await supabase.storage.from("measurement-references").remove([ref.storage_path]);
      const { error } = await supabase.from("measurement_references").delete().eq("id", ref.id);
      if (error) throw error;
      toast.success("Referencia eliminada");
      qc.invalidateQueries({ queryKey: ["measurement-references"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  if (!ref && !isAdmin) return null;

  return (
    <div className="mb-1.5 flex items-start gap-2">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted/40">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" title={`Ver referencia: ${label}`}>
            <img src={url} alt={`Referencia ${label}`} className="h-full w-full object-cover" />
          </a>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-5 w-5" />
          </div>
        )}
      </div>
      {isAdmin && (
        <div className="flex flex-col gap-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onUpload}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            <span className="ml-1">{ref ? "Cambiar" : "Subir"}</span>
          </Button>
          {ref && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="h-3 w-3" />
              <span className="ml-1">Quitar</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function NumFieldWithRef({
  fieldKey,
  label,
  value,
  onChange,
  step,
  isAdmin,
  refMap,
}: {
  fieldKey: string;
  label: string;
  value: number | null;
  onChange: (v: string) => void;
  step?: string;
  isAdmin: boolean;
  refMap: Map<string, MeasurementRef> | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <FieldRefThumb fieldKey={fieldKey} label={label} isAdmin={isAdmin} refMap={refMap} />
      <Label>{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        step={step ?? "1"}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function ChartsView({ rows }: { rows: Row[] }) {
  // Enrich with derived series and sort ascending by date
  const data = useMemo(() => {
    const sorted = [...rows].sort((a, b) => a.measurement_date.localeCompare(b.measurement_date));
    return sorted.map((r) => ({
      date: r.measurement_date,
      label: formatDate(r.measurement_date),
      peso: r.weight_kg,
      imc: (() => {
        const b = calcBMI(r.weight_kg, r.height_cm);
        return b != null ? Number(b.toFixed(2)) : null;
      })(),
      p_abdominal: r.p_abdominal,
      p_chest: r.p_chest,
      p_shoulders: r.p_shoulders,
      p_arm_relaxed: r.p_arm_relaxed,
      p_arm_contracted: r.p_arm_contracted,
      p_thigh: r.p_thigh,
      p_hip: r.p_hip,
      p_waist: r.p_waist,
      p_calves: r.p_calves,
      s_calves: r.s_calves,
      s_triceps: r.s_triceps,
      s_biceps: r.s_biceps,
      s_abdominal: r.s_abdominal,
      s_suprailiac: r.s_suprailiac,
      s_pectoral: r.s_pectoral,
      s_axillary: r.s_axillary,
      s_supraspinal: r.s_supraspinal,
      s_subscapular: r.s_subscapular,
      sum_pliegues: (() => {
        const v = sumSkinfolds(r);
        return v > 0 ? Number(v.toFixed(1)) : null;
      })(),
      masa_grasa: (() => {
        const v = faulkner(r);
        return v != null ? Number(v.toFixed(2)) : null;
      })(),
      pct_grasa: (() => {
        const v = jacksonPollock(r);
        return v != null ? Number(v.toFixed(2)) : null;
      })(),
    }));
  }, [rows]);

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Aún no hay datos para graficar.
        </CardContent>
      </Card>
    );
  }

  const generales: { key: string; label: string }[] = [
    { key: "peso", label: "Peso (kg)" },
    { key: "imc", label: "IMC" },
  ];
  const perims = PERIMETERS.map((p) => ({ key: p.key as string, label: `${p.label} (cm)` }));
  const pliegues = [
    ...SKINFOLDS.filter((s) =>
      [
        "s_calves",
        "s_triceps",
        "s_biceps",
        "s_abdominal",
        "s_suprailiac",
        "s_pectoral",
        "s_axillary",
        "s_supraspinal",
      ].includes(s.key as string),
    ).map((s) => ({ key: s.key as string, label: `${s.label} (mm)` })),
    { key: "sum_pliegues", label: "Sumatoria de pliegues (mm)" },
  ];
  const composicion = [
    { key: "masa_grasa", label: "Masa grasa Faulkner (%)" },
    { key: "pct_grasa", label: "% grasa J&P 7 (%)" },
  ];

  return (
    <div className="space-y-8">
      <ChartGroup title="Datos generales" charts={generales} data={data} color="#ef4444" />
      <ChartGroup title="Perímetros" charts={perims} data={data} color="#22c55e" />
      <ChartGroup title="Pliegues" charts={pliegues} data={data} color="#3b82f6" />
      <ChartGroup title="Composición corporal" charts={composicion} data={data} color="#eab308" />
    </div>
  );
}

function ChartGroup({
  title,
  charts,
  data,
  color,
}: {
  title: string;
  charts: { key: string; label: string }[];
  data: any[];
  color: string;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {charts.map((c) => {
          const gradId = `grad-${c.key}`;
          return (
            <Card key={c.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{c.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey={c.key}
                        stroke={color}
                        strokeWidth={2.5}
                        fill={`url(#${gradId})`}
                        dot={{ r: 3, fill: color, strokeWidth: 0 }}
                        activeDot={{
                          r: 5,
                          fill: color,
                          stroke: "hsl(var(--background))",
                          strokeWidth: 2,
                        }}
                        connectNulls
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

type CompRow = { key: string; label: string; unit?: string; digits?: number };

type PatientProfile = {
  full_name: string | null;
  sport: string | null;
  goal: string | null;
} | null;

function ComparativeView({ rows, profile }: { rows: Row[]; profile: PatientProfile }) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.measurement_date.localeCompare(b.measurement_date)),
    [rows],
  );

  const [downloading, setDownloading] = useState(false);

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Aún no hay datos para comparar.
        </CardContent>
      </Card>
    );
  }

  const enriched = sorted.map((r) => ({
    row: r,
    bmi: calcBMI(r.weight_kg, r.height_cm),
    sum: sumSkinfolds(r),
    fat: faulkner(r),
    jp: jacksonPollock(r),
  }));

  const generales: CompRow[] = [
    { key: "weight_kg", label: "Peso", unit: "kg", digits: 1 },
    { key: "height_cm", label: "Talla", unit: "cm", digits: 1 },
    { key: "__bmi", label: "IMC", digits: 1 },
  ];
  const perimetros: CompRow[] = PERIMETERS.map((p) => ({
    key: p.key as string,
    label: p.label,
    unit: "cm",
    digits: 1,
  }));
  const pliegues: CompRow[] = [
    ...SKINFOLDS.map((s) => ({ key: s.key as string, label: s.label, unit: "mm", digits: 1 })),
    { key: "__sum", label: "Sumatoria pliegues", unit: "mm", digits: 1 },
  ];
  const composicion: CompRow[] = [
    { key: "__fat", label: "Masa grasa (Faulkner)", unit: "%", digits: 2 },
    { key: "__jp", label: "% grasa (J&P 7)", unit: "%", digits: 2 },
  ];

  function cellValue(e: (typeof enriched)[number], key: string): number | null {
    if (key === "__bmi") return e.bmi;
    if (key === "__sum") return e.sum > 0 ? e.sum : null;
    if (key === "__fat") return e.fat;
    if (key === "__jp") return e.jp;
    const v = e.row[key as keyof Row];
    return typeof v === "number" ? v : null;
  }

  const groups: {
    title: string;
    rowsDef: CompRow[];
    color: string;
    rgb: [number, number, number];
  }[] = [
    { title: "Datos generales", rowsDef: generales, color: "#ef4444", rgb: [239, 68, 68] },
    { title: "Perímetros", rowsDef: perimetros, color: "#22c55e", rgb: [34, 197, 94] },
    { title: "Pliegues", rowsDef: pliegues, color: "#3b82f6", rgb: [59, 130, 246] },
    { title: "Composición corporal", rowsDef: composicion, color: "#eab308", rgb: [234, 179, 8] },
  ];

  async function downloadPdf() {
    try {
      setDownloading(true);
      const logoDataUrl = await fetchImageAsDataUrl(logoAsset.url);
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Header (top-left): logo + name
      const headerY = 30;
      const logoSize = 44;
      // green badge behind logo
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

      // Title (centered)
      doc.setTextColor(20, 20, 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Medidas antropométricas", pageW / 2, headerY + 28, { align: "center" });

      // Patient info block
      let y = headerY + logoSize + 20;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(40, y - 8, pageW - 40, y - 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      const patientName = profile?.full_name?.trim() || "—";
      const sport = profile?.sport?.trim() || "—";
      const goal = profile?.goal?.trim() || "—";
      doc.text("Paciente:", 40, y + 8);
      doc.setFont("helvetica", "normal");
      doc.text(patientName, 105, y + 8);
      doc.setFont("helvetica", "bold");
      doc.text("Deporte:", 40, y + 26);
      doc.setFont("helvetica", "normal");
      doc.text(sport, 105, y + 26);
      doc.setFont("helvetica", "bold");
      doc.text("Objetivo:", 40, y + 44);
      doc.setFont("helvetica", "normal");
      const goalLines = doc.splitTextToSize(goal, pageW - 40 - 105);
      doc.text(goalLines, 105, y + 44);

      let cursorY = y + 44 + Math.max(18, goalLines.length * 12) + 10;

      // Tables per group
      const dateHeaders = enriched.map((e) => formatDate(e.row.measurement_date));

      for (const g of groups) {
        const head = [["Indicador", ...dateHeaders]];
        const body = g.rowsDef.map((r) => {
          const values = enriched.map((e) => cellValue(e, r.key));
          const cells = values.map((v) => {
            if (v == null) return "—";
            return `${v.toFixed(r.digits ?? 1)}${r.unit ? " " + r.unit : ""}`;
          });
          const label = r.unit ? `${r.label} (${r.unit})` : r.label;
          return [label, ...cells];
        });

        // Section title bar
        if (cursorY > pageH - 120) {
          doc.addPage();
          cursorY = 40;
        }
        doc.setFillColor(g.rgb[0], g.rgb[1], g.rgb[2]);
        doc.rect(40, cursorY, 4, 16, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(20, 20, 20);
        doc.text(g.title, 52, cursorY + 12);
        cursorY += 20;

        autoTable(doc, {
          startY: cursorY,
          head,
          body,
          styles: { fontSize: 9, cellPadding: 5, textColor: [30, 30, 30] },
          headStyles: {
            fillColor: g.rgb,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "center",
          },
          bodyStyles: { halign: "center" },
          columnStyles: { 0: { halign: "left", fontStyle: "bold", cellWidth: 160 } },
          alternateRowStyles: { fillColor: [248, 248, 248] },
          margin: { left: 40, right: 40, bottom: 60 },
          theme: "grid",
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cursorY = (doc as any).lastAutoTable.finalY + 18;
      }

      // Footer on every page (bottom-right)
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
      doc.save(`medidas-antropometricas-${safeName}-${todayISO()}.pdf`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo generar el PDF";
      toast.error(msg);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Button onClick={downloadPdf} disabled={downloading}>
          {downloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Descargar PDF
        </Button>
      </div>
      {groups.map((g) => (
        <ComparativeTable
          key={g.title}
          title={g.title}
          rowsDef={g.rowsDef}
          entries={enriched}
          color={g.color}
          cellValue={cellValue}
        />
      ))}
    </div>
  );
}

async function fetchImageAsDataUrl(url: string): Promise<string> {
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

function ComparativeTable({
  title,
  rowsDef,
  entries,
  color,
  cellValue,
}: {
  title: string;
  rowsDef: CompRow[];
  entries: { row: Row; bmi: number | null; sum: number; fat: number | null; jp: number | null }[];
  color: string;
  cellValue: (e: any, key: string) => number | null;
}) {
  const headerStyle = {
    backgroundColor: `${color}22`,
    color,
    borderColor: `${color}55`,
  } as React.CSSProperties;
  const accentBar = { backgroundColor: color } as React.CSSProperties;

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <span className="h-6 w-1.5 rounded-full" style={accentBar} />
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <Card className="overflow-hidden" style={{ borderColor: `${color}55` }}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th
                  className="sticky left-0 z-10 border-b px-3 py-2 text-left font-medium"
                  style={headerStyle}
                >
                  Indicador
                </th>
                {entries.map((e) => (
                  <th
                    key={e.row.id}
                    className="whitespace-nowrap border-b px-3 py-2 text-center font-medium"
                    style={headerStyle}
                  >
                    {formatDate(e.row.measurement_date)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowsDef.map((r, i) => {
                const values = entries.map((e) => cellValue(e, r.key));
                return (
                  <tr key={r.key} className={i % 2 === 0 ? "bg-muted/20" : ""}>
                    <td
                      className="sticky left-0 z-10 border-b border-border/60 bg-background px-3 py-2 font-medium"
                      style={{ borderLeft: `3px solid ${color}` }}
                    >
                      {r.label}
                      {r.unit && (
                        <span className="ml-1 text-xs text-muted-foreground">({r.unit})</span>
                      )}
                    </td>
                    {values.map((v, j) => {
                      const prev = j > 0 ? values[j - 1] : null;
                      const diff = v != null && prev != null ? v - prev : null;
                      const diffStr =
                        diff != null && Math.abs(diff) >= 0.005
                          ? `${diff > 0 ? "▲" : "▼"} ${Math.abs(diff).toFixed(r.digits ?? 1)}`
                          : null;
                      const diffColor =
                        diff == null || Math.abs(diff) < 0.005
                          ? "text-muted-foreground"
                          : diff > 0
                            ? "text-emerald-500"
                            : "text-red-500";
                      return (
                        <td
                          key={j}
                          className="whitespace-nowrap border-b border-border/60 px-3 py-2 text-center"
                        >
                          <div
                            className="font-semibold"
                            style={{ color: v == null ? undefined : color }}
                          >
                            {v == null ? "—" : v.toFixed(r.digits ?? 1)}
                          </div>
                          {diffStr && <div className={`text-[10px] ${diffColor}`}>{diffStr}</div>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
