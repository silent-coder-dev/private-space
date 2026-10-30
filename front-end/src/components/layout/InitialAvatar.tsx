import { useSpace } from "@/context/space";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
  "2xl": "h-28 w-28 text-4xl",
};

export type AvatarSize = keyof typeof SIZES;

/** A round avatar: the person's photo, or the first letter of their name on a gradient. Optional online dot. */
export function InitialAvatar({
  name,
  photo,
  size = "md",
  online,
  variant = "primary",
  className,
}: {
  name: string;
  photo?: string;
  size?: AvatarSize;
  online?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <div className={cn("relative shrink-0", className)}>
      {photo ? (
        <img src={photo} alt={name} draggable={false} className={cn("rounded-full object-cover ring-2 ring-background", SIZES[size])} />
      ) : (
        <div
          className={cn(
            "grid place-items-center rounded-full font-heading font-bold text-white ring-2 ring-background",
            variant === "primary" ? "gradient-primary" : "bg-gradient-to-br from-secondary to-blush",
            SIZES[size],
          )}
          aria-label={name}
        >
          {(name.trim()[0] || "?").toUpperCase()}
        </div>
      )}
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

/** You or your partner, with their profile photo if they added one. */
export function UserAvatar({ who, ...rest }: { who: "me" | "partner"; size?: AvatarSize; online?: boolean; className?: string }) {
  const { profile } = useSpace();
  return (
    <InitialAvatar
      name={who === "me" ? profile.me : profile.partner}
      photo={who === "me" ? profile.myPhoto : profile.partnerPhoto}
      variant={who === "me" ? "primary" : "secondary"}
      {...rest}
    />
  );
}
