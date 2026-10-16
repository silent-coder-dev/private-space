import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
};

/** A round gradient avatar showing the first letter of a name, with an optional online dot. */
export function InitialAvatar({
  name,
  size = "md",
  online,
  variant = "primary",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  online?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "grid place-items-center rounded-full font-heading font-bold text-white ring-2 ring-background",
          variant === "primary" ? "gradient-primary" : "bg-gradient-to-br from-secondary to-blush",
          SIZES[size],
        )}
      >
        {(name.trim()[0] || "?").toUpperCase()}
      </div>
      {online !== undefined && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background",
            online ? "bg-success" : "bg-muted-foreground",
          )}
        >
          {online && <span className="absolute inset-0 animate-ripple rounded-full bg-success" />}
        </span>
      )}
    </div>
  );
}
