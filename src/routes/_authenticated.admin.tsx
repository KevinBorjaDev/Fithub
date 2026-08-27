import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Search,
  Pencil,
  Users,
  CalendarDays,
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  Camera,
  Ruler,
  FileText,
  Dumbbell,
  UtensilsCrossed,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInCalendarDays, isSameDay, parseISO, addDays } from "date-fns";
import { es } from "date-fns/locale";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  sport: string | null;
  goal: string | null;
  program_start_date: string | null;
  program_end_date: string | null;
  next_consultation_date: string | null;
  is_active: boolean;
};

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Administración — Lic. Diego Rivera" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Profile | null>(null);
  const [accessing, setAccessing] = useState<Profile | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [loading, isAdmin, navigate]);

  const { data: patients, isLoading } = useQuery({
    queryKey: ["admin", "patients"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id,email,full_name,avatar_url,birth_date,height_cm,weight_kg,sport,goal,program_start_date,program_end_date,next_consultation_date,is_active",
        )
        .order("full_name", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  // Restore floating modules dialog when returning to /admin
  useEffect(() => {
    if (!isAdmin || !patients || accessing) return;
    const stored =
      typeof window !== "undefined" ? sessionStorage.getItem("admin:viewingPatient") : null;
    if (!stored) return;
    const p = patients.find((x) => x.id === stored);
    if (p) setAccessing(p);
  }, [isAdmin, patients, accessing]);

  const openModules = (p: Profile) => {
    try {
      sessionStorage.setItem("admin:viewingPatient", p.id);
    } catch {
      /* ignore */
    }
    setAccessing(p);
  };
  const closeModules = () => {
    try {
      sessionStorage.removeItem("admin:viewingPatient");
    } catch {
      /* ignore */
    }
    setAccessing(null);
  };

  const filtered = useMemo(() => {
    if (!patients) return [];
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        (p.full_name ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.sport ?? "").toLowerCase().includes(q) ||
        (p.goal ?? "").toLowerCase().includes(q),
    );
  }, [patients, search]);

  const updateMut = useMutation({
    mutationFn: async (p: Profile) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: p.full_name,
          birth_date: p.birth_date,
          height_cm: p.height_cm,
          weight_kg: p.weight_kg,
          sport: p.sport,
          goal: p.goal,
          program_start_date: p.program_start_date,
          program_end_date: p.program_end_date,
          next_consultation_date: p.next_consultation_date,
          is_active: p.is_active,
        })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paciente actualizado");
      qc.invalidateQueries({ queryKey: ["admin", "patients"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActiveMut = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.is_active ? "Paciente activado" : "Paciente desactivado");
      qc.invalidateQueries({ queryKey: ["admin", "patients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <Card style={{ boxShadow: "var(--shadow-elegant)" }}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ background: "var(--gradient-primary)" }}
            >
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle>Panel de administración</CardTitle>
              <CardDescription>
                Gestiona pacientes, sus datos antropométricos y objetivos.
              </CardDescription>
            </div>
          </div>
          <div className="pt-4">
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/admin-surveys">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Ver encuestas mensuales
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/admin-nutri">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Conoce a tu Nutri
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <ConsultationCalendar patients={patients ?? []} onEdit={setEditing} />

      <Card style={{ boxShadow: "var(--shadow-elegant)" }}>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">
                Pacientes {patients ? `(${patients.length})` : ""}
              </CardTitle>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, correo, deporte…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Cargando pacientes…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {search ? "Sin resultados." : "Aún no hay pacientes registrados."}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((p) => (
                <div key={p.id} className="flex items-center gap-4 py-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={p.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {(p.full_name ?? p.email ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      {p.full_name ?? "Sin nombre"}
                      {p.is_active ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end text-xs text-muted-foreground">
                    <span>{p.sport ?? "—"}</span>
                    <span>{p.goal ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`active-${p.id}`}
                      className="text-xs text-muted-foreground hidden md:block"
                    >
                      Acceso
                    </Label>
                    <Switch
                      id={`active-${p.id}`}
                      checked={p.is_active}
                      onCheckedChange={(v) => toggleActiveMut.mutate({ id: p.id, is_active: v })}
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline ml-1">Editar</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => openModules(p)}
                    style={{ background: "var(--gradient-primary)" }}
                    className="text-primary-foreground"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline ml-1">Ver módulos</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditPatientDialog
        patient={editing}
        onClose={() => setEditing(null)}
        onSave={(p) => updateMut.mutate(p)}
        saving={updateMut.isPending}
      />
      <PatientModulesDialog patient={accessing} onClose={closeModules} />
    </div>
  );
}

function ConsultationCalendar({
  patients,
  onEdit,
}: {
  patients: Profile[];
  onEdit: (p: Profile) => void;
}) {
  const [month, setMonth] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  const consultationDays = useMemo(() => {
    return patients
      .filter((p) => p.next_consultation_date)
      .map((p) => parseISO(p.next_consultation_date!));
  }, [patients]);

  const dayPatients = useMemo(() => {
    if (!selected) return [];
    return patients.filter(
      (p) => p.next_consultation_date && isSameDay(parseISO(p.next_consultation_date), selected),
    );
  }, [patients, selected]);

  const today = new Date();
  const endingSoon = useMemo(() => {
    return patients
      .filter((p) => p.program_end_date)
      .map((p) => ({
        p,
        days: differenceInCalendarDays(parseISO(p.program_end_date!), today),
      }))
      .filter((x) => x.days >= 0 && x.days <= 5)
      .sort((a, b) => a.days - b.days);
  }, [patients, today]);

  return (
    <Card style={{ boxShadow: "var(--shadow-elegant)" }}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Agenda de consultas</CardTitle>
        </div>
        <CardDescription>
          Próximas consultas de cada paciente. Alerta cuando faltan 5 días o menos para finalizar el
          programa.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {endingSoon.length > 0 && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Programas por finalizar
            </div>
            <ul className="text-sm space-y-1">
              {endingSoon.map(({ p, days }) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    <button className="font-medium hover:underline" onClick={() => onEdit(p)}>
                      {p.full_name ?? p.email ?? "Paciente"}
                    </button>{" "}
                    <span className="text-muted-foreground">
                      · finaliza {format(parseISO(p.program_end_date!), "d MMM", { locale: es })}
                    </span>
                  </span>
                  <Badge variant="destructive" className="text-[10px]">
                    {days === 0 ? "hoy" : `en ${days} d`}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex justify-center md:justify-start">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={setSelected}
              month={month}
              onMonthChange={setMonth}
              locale={es}
              modifiers={{ consultation: consultationDays }}
              modifiersClassNames={{
                consultation:
                  "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
              }}
              className="rounded-md border pointer-events-auto"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2 text-sm font-medium">
              <CalendarClock className="h-4 w-4 text-primary" />
              {selected
                ? format(selected, "EEEE d 'de' MMMM", { locale: es })
                : "Selecciona un día"}
            </div>
            {dayPatients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin consultas agendadas este día.</p>
            ) : (
              <ul className="space-y-2">
                {dayPatients.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg border border-border/60 p-2"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={p.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {(p.full_name ?? p.email ?? "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {p.full_name ?? "Sin nombre"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(parseISO(p.next_consultation_date!), "HH:mm")} h · {p.sport ?? "—"}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => onEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 text-xs text-muted-foreground">
              Total con consulta agendada:{" "}
              <span className="font-medium text-foreground">{consultationDays.length}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EditPatientDialog({
  patient,
  onClose,
  onSave,
  saving,
}: {
  patient: Profile | null;
  onClose: () => void;
  onSave: (p: Profile) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<Profile | null>(patient);

  useEffect(() => {
    setDraft(patient);
  }, [patient]);

  return (
    <Dialog open={!!patient} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar paciente</DialogTitle>
          <DialogDescription>{patient?.email}</DialogDescription>
        </DialogHeader>
        {draft && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre completo" className="col-span-2">
              <Input
                value={draft.full_name ?? ""}
                onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
              />
            </Field>
            <Field label="Fecha de nacimiento">
              <Input
                type="date"
                value={draft.birth_date ?? ""}
                onChange={(e) => setDraft({ ...draft, birth_date: e.target.value || null })}
              />
            </Field>
            <Field label="Deporte">
              <Input
                value={draft.sport ?? ""}
                onChange={(e) => setDraft({ ...draft, sport: e.target.value || null })}
              />
            </Field>
            <Field label="Talla (cm)">
              <Input
                type="number"
                value={draft.height_cm ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, height_cm: e.target.value ? Number(e.target.value) : null })
                }
              />
            </Field>
            <Field label="Peso (kg)">
              <Input
                type="number"
                step="0.1"
                value={draft.weight_kg ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, weight_kg: e.target.value ? Number(e.target.value) : null })
                }
              />
            </Field>
            <Field label="Objetivo" className="col-span-2">
              <Input
                value={draft.goal ?? ""}
                onChange={(e) => setDraft({ ...draft, goal: e.target.value || null })}
              />
            </Field>
            <Field label="Inicio del programa">
              <Input
                type="date"
                value={draft.program_start_date ?? ""}
                onChange={(e) => {
                  const start = e.target.value || null;
                  const end = start ? format(addDays(parseISO(start), 30), "yyyy-MM-dd") : null;
                  setDraft({ ...draft, program_start_date: start, program_end_date: end });
                }}
              />
            </Field>
            <Field label="Término del programa">
              <Input
                type="date"
                value={draft.program_end_date ?? ""}
                onChange={(e) => setDraft({ ...draft, program_end_date: e.target.value || null })}
              />
            </Field>
            <Field label="Próxima consulta" className="col-span-2">
              <Input
                type="datetime-local"
                value={
                  draft.next_consultation_date ? draft.next_consultation_date.slice(0, 16) : ""
                }
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    next_consultation_date: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  })
                }
              />
            </Field>
            <Field label="Acceso a la plataforma" className="col-span-2">
              <div className="flex items-center gap-3 rounded-md border border-border/60 p-2">
                <Switch
                  checked={draft.is_active}
                  onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
                />
                <span className="text-sm">
                  {draft.is_active ? "Activo — puede acceder" : "Inactivo — acceso bloqueado"}
                </span>
              </div>
            </Field>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => draft && onSave(draft)} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function PatientModulesDialog({
  patient,
  onClose,
}: {
  patient: Profile | null;
  onClose: () => void;
}) {
  const modules = patient
    ? ([
        {
          to: "/plan",
          label: "Plan nutricional",
          icon: UtensilsCrossed,
          color: "hsl(140 60% 45%)",
        },
        {
          to: "/training",
          label: "Plan de entrenamiento",
          icon: Dumbbell,
          color: "hsl(210 70% 50%)",
        },
        {
          to: "/measurements",
          label: "Medidas antropométricas",
          icon: Ruler,
          color: "hsl(45 90% 50%)",
        },
        { to: "/photos", label: "Fotos de progreso", icon: Camera, color: "hsl(320 60% 55%)" },
        { to: "/documents", label: "Documentos", icon: FileText, color: "hsl(20 80% 55%)" },
        {
          to: "/admin-surveys",
          label: "Encuestas mensuales",
          icon: ClipboardList,
          color: "hsl(260 60% 55%)",
        },
      ] as const)
    : [];

  return (
    <Dialog open={!!patient} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            {patient?.full_name ?? "Paciente"}
          </DialogTitle>
          <DialogDescription>
            Accede directamente a cada módulo de este paciente para visualizar, editar o cargar
            información.
          </DialogDescription>
        </DialogHeader>
        {patient && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {modules.map((m) => (
              <Link
                key={m.to}
                to={m.to}
                search={m.to === "/admin-surveys" ? undefined : ({ patient: patient.id } as never)}
                className="flex items-center gap-3 rounded-lg border border-border/60 p-3 hover:bg-accent/40 transition-colors"
              >
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${m.color}22`, color: m.color }}
                >
                  <m.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{m.label}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    Ver / editar como nutricionista
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
