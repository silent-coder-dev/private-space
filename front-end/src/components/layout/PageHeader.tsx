import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { EASE_OUT } from "@/lib/motion";

/** The title row at the top of every page inside the app. */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className="flex flex-wrap items-center justify-between gap-4"
    >
      <div className="flex min-w-0 items-center gap-4">
        <motion.div
          initial={{ scale: 0.6, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.05 }}
          className="shine grid h-12 w-12 shrink-0 place-items-center rounded-2xl gradient-primary glow-primary"
        >
          <Icon className="h-6 w-6 text-white" />
        </motion.div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold md:text-3xl">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </motion.header>
  );
}
