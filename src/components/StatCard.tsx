import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  onClick,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-card border rounded-lg p-5 flex items-start justify-between",
        onClick && "cursor-pointer hover:shadow-md transition-shadow",
        className
      )}
      onClick={onClick}
    >
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {(subtitle || trend) && (
          <p className="text-xs text-muted-foreground">
            {trend && (
              <span className="text-emerald-600 font-medium">{trend} </span>
            )}
            {subtitle}
          </p>
        )}
      </div>
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
    </div>
  );
}
