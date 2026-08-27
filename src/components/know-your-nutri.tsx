import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  GraduationCap,
  Briefcase,
  Trophy,
  HeartPulse,
  Quote,
  Dumbbell,
  Pencil,
  ChevronRight,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import {
  useNutriPhotos,
  useNutriProfile,
  useSignedUrls,
  type NutriItem,
  type NutriPhoto,
} from "@/lib/nutri-profile";

const SECTION_META: Record<string, { icon: typeof Sparkles; label: string }> = {
  who: { icon: Sparkles, label: "¿Quién soy?" },
  why: { icon: Dumbbell, label: "¿Por qué Nutrición Deportiva?" },
  academic: { icon: GraduationCap, label: "Logros académicos" },
  professional: { icon: Briefcase, label: "Logros profesionales" },
  athletes: { icon: Trophy, label: "Deportistas y pacientes" },
  personal: { icon: HeartPulse, label: "Logros personales" },
  message: { icon: Quote, label: "Mensaje para mi paciente" },
};

function Paragraphs({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="space-y-3">
      {text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {p}
          </p>
        ))}
    </div>
  );
}

function ItemGrid({ items }: { items: NutriItem[] }) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((it, i) => (
        <div
          key={i}
          className="rounded-lg border border-border/60 bg-muted/20 p-3 transition-colors hover:border-primary/50"
        >
          <div className="flex items-start gap-2">
            <div
              className="mt-0.5 h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-[11px] font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              {i + 1}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">{it.title}</div>
              {it.subtitle ? (
                <div className="text-xs text-muted-foreground mt-0.5">{it.subtitle}</div>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PhotoStrip({ photos, urls }: { photos: NutriPhoto[]; urls: Record<string, string> }) {
  if (!photos.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
      {photos.map((p) => (
        <figure
          key={p.id}
          className="overflow-hidden rounded-lg border border-border/60 bg-muted/20"
        >
          <img
            src={urls[p.storage_path]}
            alt={p.caption ?? "Fotografía del nutricionista"}
            loading="lazy"
            className="h-32 w-full object-cover"
          />
          {p.caption ? (
            <figcaption className="px-2 py-1 text-[11px] text-muted-foreground truncate">
              {p.caption}
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}

export function KnowYourNutri() {
  const { isAdmin } = useAuth();
  const { data: profile } = useNutriProfile();
  const { data: photos } = useNutriPhotos();
  const [open, setOpen] = useState(false);

  const paths = useMemo(() => {
    const list = (photos ?? []).map((p) => p.storage_path);
    if (profile?.photo_path) list.push(profile.photo_path);
    return list;
  }, [photos, profile?.photo_path]);
  const { data: urls } = useSignedUrls(paths);
  const urlMap = urls ?? {};

  if (!profile) return null;
  if (!profile.is_visible && !isAdmin) return null;

  const initials = profile.name
    .replace(/^Lic\.?\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const order = profile.section_order.length
    ? profile.section_order
    : ["who", "why", "academic", "professional", "athletes", "personal", "message"];

  const photosFor = (section: string) => (photos ?? []).filter((p) => p.section === section);

  const renderSection = (id: string) => {
    const meta = SECTION_META[id];
    if (!meta) return null;
    const Icon = meta.icon;
    let title = meta.label;
    let body: React.ReactNode = null;

    if (id === "who") {
      title = profile.who_title;
      body = <Paragraphs text={profile.who_body} />;
    } else if (id === "why") {
      title = profile.why_title;
      body = <Paragraphs text={profile.why_body} />;
    } else if (id === "academic") {
      title = profile.academic_title;
      body = <ItemGrid items={profile.academic_items} />;
    } else if (id === "professional") {
      title = profile.professional_title;
      body = <ItemGrid items={profile.professional_items} />;
    } else if (id === "athletes") {
      title = profile.athletes_title;
      body = <ItemGrid items={profile.athletes_items} />;
    } else if (id === "personal") {
      title = profile.personal_title;
      body = (
        <div className="space-y-3">
          <Paragraphs text={profile.personal_body} />
          {profile.personal_items.length > 0 && (
            <ul className="space-y-2">
              {profile.personal_items.map((it, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    } else if (id === "message") {
      title = profile.message_title;
      body = (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-3">
          <Paragraphs text={profile.message_body} />
          <div className="pt-1 border-t border-border/60">
            <div className="text-sm font-semibold text-foreground">{profile.name}</div>
            <div className="text-xs text-muted-foreground">{profile.role_title}</div>
          </div>
        </div>
      );
    }

    return (
      <AccordionItem key={id} value={id} className="border-border/60">
        <AccordionTrigger className="hover:no-underline">
          <span className="flex items-center gap-2 text-left">
            <Icon className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium">{title}</span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3">
          {body}
          <PhotoStrip photos={photosFor(id)} urls={urlMap} />
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <Card style={{ boxShadow: "var(--shadow-elegant)" }} className="overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
          <Avatar className="h-20 w-20 rounded-xl border-2 border-primary/40 shrink-0 overflow-hidden">
            <AvatarImage
              src={profile.photo_path ? urlMap[profile.photo_path] : undefined}
              alt={`Fotografía de ${profile.name}`}
              className="h-full w-full object-cover"
            />
            <AvatarFallback className="rounded-xl bg-primary/20 text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <h2 className="text-base font-semibold text-foreground">{profile.panel_title}</h2>
              {!profile.is_visible && isAdmin && (
                <Badge variant="outline" className="text-[10px]">
                  Oculto para pacientes
                </Badge>
              )}
            </div>
            <div className="mt-1 text-lg font-semibold text-foreground">{profile.name}</div>
            <div className="text-sm text-primary">{profile.role_title}</div>

            <div className="mt-3 flex flex-col sm:flex-row gap-2 justify-center sm:justify-start">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Sparkles className="h-4 w-4 mr-2" />
                    {profile.cta_label}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      {profile.panel_title}
                    </DialogTitle>
                    <DialogDescription>
                      {profile.name} — {profile.role_title}
                    </DialogDescription>
                  </DialogHeader>
                  <Accordion type="multiple" defaultValue={[order[0]]} className="w-full">
                    {order.map(renderSection)}
                  </Accordion>
                  <PhotoStrip photos={photosFor("gallery")} urls={urlMap} />
                </DialogContent>
              </Dialog>

              {isAdmin && (
                <Button size="sm" variant="outline" asChild>
                  <Link to="/admin-nutri">
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar contenido
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
