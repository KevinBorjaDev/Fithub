import { cn } from "@/lib/utils";
import logoAsset from "@/assets/diego-rivera-logo-new.png.asset.json";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { badge: "h-10 w-10", title: "text-sm", subtitle: "text-[10px]" },
  md: { badge: "h-14 w-14", title: "text-base", subtitle: "text-xs" },
  lg: { badge: "h-20 w-20", title: "text-lg", subtitle: "text-xs" },
};

export function BrandLogo({ size = "md", showText = true, className }: BrandLogoProps) {
  const s = sizes[size];
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-xl overflow-hidden bg-secondary shadow-lg",
          s.badge,
        )}
        aria-hidden
      >
        <img
          src={logoAsset.url}
          alt="Diego Rivera - Nutricionista"
          className="h-full w-full object-contain p-1"
        />
      </div>
      {showText && (
        <div className="leading-tight">
          <div className={cn("font-semibold text-foreground", s.title)}>Lic. Diego Rivera</div>
          <div className={cn("uppercase tracking-widest text-muted-foreground", s.subtitle)}>
            Nutrición Deportiva
          </div>
        </div>
      )}
    </div>
  );
}
