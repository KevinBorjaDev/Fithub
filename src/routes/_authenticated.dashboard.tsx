import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  FileText,
  Ruler,
  Salad,
  Dumbbell,
  BookOpen,
  Target,
  Trophy,
  ChevronRight,
  Loader2,
  CalendarDays,
  AlertTriangle,
  ClipboardList,
  Pencil,
  Save,
  X,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { KnowYourNutri } from "@/components/know-your-nutri";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Panel — Lic. Diego Rivera" },
      {
        name: "description",
        content:
          "Consulta tu progreso, planes nutricionales y rutinas de entrenamiento en tu panel personal con el Lic. Diego Rivera.",
      },
      { property: "og:title", content: "Panel — Lic. Diego Rivera" },
      {
        property: "og:description",
        content:
          "Sigue tu evolución, mediciones y planes de nutrición y entrenamiento desde tu panel personal.",
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

const MODULES = [
  {
    id: "photos",
    title: "Fotos",
    desc: "Sube y compara tu progreso visual.",
    icon: Camera,
    href: "/photos",
  },
  {
    id: "survey",
    title: "Encuesta mensual",
    desc: "Responde tu seguimiento mensual.",
    icon: ClipboardList,
    href: "/survey",
  },
  {
    id: "documents",
    title: "Documentos",
    desc: "Exámenes, bioimpedancia y más.",
    icon: FileText,
    href: "/documents",
  },
  {
    id: "measurements",
    title: "Medidas antropométricas",
    desc: "Peso, perímetros, pliegues y gráficos.",
    icon: Ruler,
    href: "/measurements",
  },
  {
    id: "nutrition",
    title: "Plan nutricional",
    desc: "Tu plan actualizado en PDF.",
    icon: Salad,
    href: "/plan",
  },
  {
    id: "training",
    title: "Plan de entrenamiento",
    desc: "Rutina semanal y cargas.",
    icon: Dumbbell,
    href: "/training",
  },
  {
    id: "program",
    title: "Documentos del programa",
    desc: "Material educativo y guías.",
    icon: BookOpen,
    href: "/program",
  },
] as const;

function calcAge(birth: string | null) {
  if (!birth) return null;
  const b = new Date(birth);
  const diff = Date.now() - b.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

function calcBMI(weight: number | null, height: number | null) {
  if (!weight || !height) return null;
  const m = height / 100;
  return (weight / (m * m)).toFixed(1);
}

function formatDate(d: string | null) {
  if (!d) return "—";
  const parsed = new Date(d + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(d: string | null): number | null {
  if (!d) return null;
  const end = new Date(d + "T00:00:00");
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (24 * 3600 * 1000));
}

function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string | undefined>(undefined);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    let cancelled = false;
    const raw = profile?.avatar_url;
    if (!raw) {
      setAvatarSrc(undefined);
      return;
    }
    if (raw.startsWith("http")) {
      setAvatarSrc(raw);
      return;
    }
    supabase.storage
      .from("avatars")
      .createSignedUrl(raw, 3600)
      .then(({ data }) => {
        if (!cancelled) setAvatarSrc(data?.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.avatar_url]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe superar los 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", user.id);
      if (updErr) throw updErr;
      await queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Foto actualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir la foto");
    } finally {
      setUploading(false);
    }
  };

  const name = profile?.full_name || user?.email?.split("@")[0] || "";
  const initials = (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const age = calcAge(profile?.birth_date ?? null);
  const bmi = calcBMI(
    profile?.weight_kg ? Number(profile.weight_kg) : null,
    profile?.height_cm ? Number(profile.height_cm) : null,
  );
  const daysLeft = daysUntil(profile?.program_end_date ?? null);
  const showEndingSoon = daysLeft !== null && daysLeft <= 5 && daysLeft >= 0;
  const endedAlready = daysLeft !== null && daysLeft < 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Welcome card - MANDATORY institutional message */}
      <Card
        className="border-primary/30 overflow-hidden relative"
        style={{ background: "var(--gradient-hero)", boxShadow: "var(--shadow-elegant)" }}
      >
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: "var(--gradient-primary)" }}
        />
        <CardContent className="relative p-6 sm:p-10">
          <Badge
            variant="secondary"
            className="mb-4 bg-primary/20 text-primary-foreground border-primary/30"
          >
            Mensaje de tu nutricionista
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground leading-tight">
            Hola, soy el Lic. Diego Rivera, nutricionista especialista en deporte.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">
            Quiero felicitarte por dar este gran paso hacia una mejora en tu salud, estética y
            rendimiento físico. Estoy seguro de que, con compromiso y constancia, lograremos
            excelentes resultados.
          </p>
        </CardContent>
      </Card>

      {(showEndingSoon || endedAlready) && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="p-5 sm:p-6 flex gap-4 items-start">
            <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-foreground">
                {endedAlready
                  ? "Tu mes de tratamiento ha culminado"
                  : daysLeft === 0
                    ? "Hoy culmina tu mes de tratamiento"
                    : `Faltan ${daysLeft} día${daysLeft === 1 ? "" : "s"} para culminar tu mes de tratamiento`}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Para poder elaborar tu nuevo plan nutricional y de entrenamiento, por favor sube tus{" "}
                <span className="font-medium text-foreground">nuevas fotos</span>, tus{" "}
                <span className="font-medium text-foreground">medidas actualizadas</span> y completa
                la{" "}
                <span className="font-medium text-foreground">encuesta mensual de seguimiento</span>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <WeeklyReminder />

      {/* Profile card */}
      <Card style={{ boxShadow: "var(--shadow-elegant)" }}>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <CardTitle className="text-lg">Tu perfil</CardTitle>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 min-w-[220px]">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                Programa
              </div>
              <div className="text-sm text-foreground mt-0.5">
                <span className="text-muted-foreground">Inicio: </span>
                <span className="font-medium">
                  {formatDate(profile?.program_start_date ?? null)}
                </span>
              </div>
              <div className="text-sm text-foreground">
                <span className="text-muted-foreground">Término: </span>
                <span className="font-medium">{formatDate(profile?.program_end_date ?? null)}</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Solo el administrador puede editar estas fechas.
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <Avatar className="h-40 w-40 sm:h-48 sm:w-48 rounded-2xl border-2 border-primary/40 shadow-md overflow-hidden">
              <AvatarImage
                src={avatarSrc}
                alt={name ? `Foto de perfil de ${name}` : "Foto de perfil"}
                className="h-full w-full object-cover"
              />
              <AvatarFallback className="bg-primary/20 text-primary-foreground text-3xl font-semibold rounded-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4 w-full">
              <div>
                <div className="text-xl font-semibold text-foreground">{name || "Sin nombre"}</div>
                <div className="text-sm text-muted-foreground">{user?.email}</div>
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Subiendo…
                      </>
                    ) : (
                      <>
                        <Camera className="h-3 w-3 mr-2" />
                        {profile?.avatar_url ? "Cambiar foto" : "Subir foto"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Edad" value={age ? `${age} años` : "—"} />
                <Stat label="Peso" value={profile?.weight_kg ? `${profile.weight_kg} kg` : "—"} />
                <Stat label="Talla" value={profile?.height_cm ? `${profile.height_cm} cm` : "—"} />
                <Stat label="IMC" value={bmi ?? "—"} />
                <Stat
                  label="Deporte"
                  value={profile?.sport ?? "—"}
                  icon={<Trophy className="h-3 w-3" />}
                  className="col-span-2"
                  wrap
                />
                <Stat
                  label="Objetivo"
                  value={profile?.goal ?? "—"}
                  icon={<Target className="h-3 w-3" />}
                  className="col-span-2"
                  wrap
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <KnowYourNutri />

      {/* Modules */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Tus módulos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((m) => (
            <ModuleCard key={m.id} module={m} isAdmin={isAdmin} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ModuleCard({
  module: m,
  isAdmin,
}: {
  module: (typeof MODULES)[number];
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState<string>(m.title);
  const [desc, setDesc] = useState<string>(m.desc);

  const { data: label } = useQuery({
    queryKey: ["module-label", m.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_labels")
        .select("title, description")
        .eq("module_id", m.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const displayTitle = label?.title ?? m.title;
  const displayDesc = label?.description ?? m.desc;

  const startEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTitle(displayTitle);
    setDesc(displayDesc);
    setEditing(true);
  };

  const cancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditing(false);
  };

  const save = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const t = title.trim();
    if (!t) {
      toast.error("El título es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("module_labels")
        .upsert(
          {
            module_id: m.id,
            title: t,
            description: desc.trim() || null,
            updated_by: user?.id ?? null,
          },
          { onConflict: "module_id" },
        );
      if (error) throw error;
      toast.success("Nombre actualizado");
      qc.invalidateQueries({ queryKey: ["module-label", m.id] });
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <Card className="h-full transition-all group-hover:border-primary/60 group-hover:-translate-y-0.5">
      <CardContent className="p-5 flex items-start gap-4">
        <div
          className="h-11 w-11 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          <m.icon className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2" onClick={(e) => e.preventDefault()}>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Título del módulo"
                className="h-8"
                autoFocus
              />
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Descripción"
                rows={2}
                className="text-sm"
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3 mr-1" />
                  )}
                  Guardar
                </Button>
                <Button size="sm" variant="ghost" onClick={cancel} disabled={saving}>
                  <X className="h-3 w-3 mr-1" /> Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-foreground truncate">{displayTitle}</div>
                <div className="flex items-center gap-1 shrink-0">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={startEdit}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Editar nombre"
                      aria-label="Editar nombre del módulo"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{displayDesc}</p>
              <Badge variant="outline" className="mt-3 text-[10px] uppercase tracking-wider">
                Próximamente
              </Badge>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (editing) {
    return <div className="group">{content}</div>;
  }
  return (
    <Link to={m.href} className="group">
      {content}
    </Link>
  );
}

function Stat({
  label,
  value,
  icon,
  className,
  wrap,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  className?: string;
  wrap?: boolean;
}) {
  return (
    <div className={`rounded-lg border border-border bg-muted/30 px-3 py-2 ${className ?? ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div
        className={`text-sm font-medium text-foreground ${wrap ? "break-words whitespace-normal" : "truncate"}`}
      >
        {value}
      </div>
    </div>
  );
}

const REMINDERS: Record<number, { emoji: string; title: string; messages: string[] }> = {
  0: {
    emoji: "🌞",
    title: "Domingo de recarga",
    messages: [
      "🌞 Domingo para descansar y prepararte. Organiza tus comidas de la semana 🥗, revisa tu rutina 🏋️ y duerme bien 😴. ¡Mañana volvemos con todo!",
      "🧘 Día de recuperación activa. Estírate, hidrátate 💦 y adelanta tus preparaciones 🍱. Un domingo bien vivido potencia toda tu semana. 💪",
      "📋 Planifica tu semana: entrenamientos 🏃‍♂️, comidas 🍽️ e hidratación 💧. Descansar también es parte del progreso. 🌿",
    ],
  },
  1: {
    emoji: "💪",
    title: "¡Buen inicio de semana!",
    messages: [
      "🚀 Arrancamos la semana con toda la energía. Cumple con tus entrenamientos 🏋️‍♂️ y sigue los pasos de tu plan nutricional 🥗. ¡Tú puedes! 💧",
      "🌟 ¡Lunes de acción! Recuerda hidratarte 💦, respetar tus horarios de comida 🍽️ y darlo todo en tu rutina 🏃‍♂️. La constancia construye resultados.",
      "🔥 Nueva semana, nuevas oportunidades. Activa tu cuerpo 🏋️, cuida tu alimentación 🥦 y mantén tu hidratación 💧. ¡Vamos con todo!",
    ],
  },
  2: {
    emoji: "🏃‍♂️",
    title: "¡Martes de constancia!",
    messages: [
      "🏃‍♂️ Segundo día de la semana, mantén el ritmo. Cumple con tu entrenamiento 🏋️, respeta tus porciones 🥗 y toma agua 💧. ¡Vas muy bien!",
      "🍎 Martes de disciplina. Prioriza proteínas, vegetales y una buena hidratación 💦. Tu cuerpo lo agradecerá. 💪",
      "⚡ La constancia es más fuerte que la motivación. Sigue tu plan al pie de la letra hoy 🥦🏋️. ¡A por el día!",
    ],
  },
  3: {
    emoji: "⚡",
    title: "Recordatorio de mitad de semana",
    messages: [
      "⚡ ¡Vas a mitad de semana! Sigue firme con tus entrenamientos 🏋️‍♀️ y respeta tu plan nutricional 🥗. El esfuerzo constante marca la diferencia. 💪",
      "🎯 Mitad de semana, mitad del camino recorrido. No bajes el ritmo: entrena 🏃‍♂️, aliméntate bien 🍎 y toma tu agua 💧. ¡Muy bien!",
      "🙌 Miércoles de foco. Continúa con tu rutina de ejercicios 🏋️ y cuida cada comida 🍽️ según tu plan. Cada día suma. 🔥",
    ],
  },
  4: {
    emoji: "🔥",
    title: "¡Jueves imparable!",
    messages: [
      "🔥 Jueves de energía. Ya casi terminamos la semana fuerte: entrena con foco 🏋️ y respeta tus comidas 🥗. ¡Sigue así!",
      "💧 Revisa cómo va tu hidratación hoy 💦 y no te saltes tus tiempos de comida 🍽️. Pequeños hábitos, grandes resultados. 💪",
      "🏆 Un día más cerca de tus objetivos. Cumple tu rutina 🏃‍♀️ y aliméntate según tu plan 🥦. ¡Vas por buen camino!",
    ],
  },
  5: {
    emoji: "🥇",
    title: "¡Planifiquemos el fin de semana!",
    messages: [
      "🥇 ¡Viernes! Aprovecha el fin de semana para planificar tus comidas 🍽️, entrenamientos 🏋️ y actividades deportivas ⚽. Un buen plan asegura mejores resultados. 💧",
      "📆 El fin de semana también cuenta. Organiza tus preparaciones 🥗, tus rutinas 🏃‍♂️ y disfruta de actividades deportivas al aire libre 🚴. ¡Sigue firme!",
      "🌿 Viernes de planificación: adelanta tus comidas 🍱, define tus horarios de entrenamiento 💪 y mantén una buena hidratación 💦. Tu constancia es tu superpoder.",
    ],
  },
  6: {
    emoji: "⚽",
    title: "¡Sábado activo!",
    messages: [
      "⚽ Sábado ideal para moverte al aire libre 🚴, disfrutar de una actividad deportiva y mantener tu alimentación consciente 🥗. ¡Disfruta con equilibrio! 💧",
      "🏋️‍♀️ Que el fin de semana no rompa tu progreso. Entrena, hidrátate 💦 y elige opciones saludables 🍎. ¡Tú decides tus resultados!",
      "🥦 Aprovecha el sábado para cocinar rico y saludable 🍱, moverte 🏃‍♂️ y descansar bien 😴. Balance = progreso. 💪",
    ],
  },
};

function WeeklyReminder() {
  const today = new Date();
  const day = today.getDay();
  const config = REMINDERS[day];
  if (!config) return null;
  const weekIdx = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / (7 * 24 * 3600 * 1000),
  );
  const message = config.messages[weekIdx % config.messages.length];
  return (
    <Card
      className="border-primary/30 overflow-hidden relative"
      style={{ boxShadow: "var(--shadow-elegant)" }}
    >
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ background: "var(--gradient-primary)" }}
      />
      <CardContent className="relative p-5 sm:p-6 flex gap-4 items-start">
        <div
          className="h-11 w-11 rounded-lg flex items-center justify-center shrink-0 text-2xl"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          <span aria-hidden>{config.emoji}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-foreground">{config.title}</div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
              Recordatorio
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
