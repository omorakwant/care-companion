import { cn } from "@/lib/utils";

const priorityConfig: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  high: { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700", label: "High" },
  medium: { dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700", label: "Medium" },
  low: { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", label: "Low" },
};

const statusConfig: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  pending: { dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700", label: "Pending" },
  in_progress: { dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700", label: "In Progress" },
  completed: { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", label: "Completed" },
};

const bedStatusConfig: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  available: { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", label: "Available" },
  occupied: { dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700", label: "Occupied" },
  maintenance: { dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700", label: "Maintenance" },
};

const patientConfig: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  active: { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", label: "Active" },
  discharged: { dot: "bg-slate-400", bg: "bg-slate-50", text: "text-slate-600", label: "Discharged" },
};

interface StatusBadgeProps {
  type: "priority" | "status" | "bed" | "patient";
  value: string;
  className?: string;
  dotOnly?: boolean;
}

export function StatusBadge({ type, value, className, dotOnly }: StatusBadgeProps) {
  const configs = { priority: priorityConfig, status: statusConfig, bed: bedStatusConfig, patient: patientConfig };
  const config = configs[type]?.[value];
  if (!config) return null;

  if (dotOnly) {
    return (
      <span
        className={cn("inline-block w-2 h-2 rounded-full shrink-0", config.dot, className)}
        title={config.label}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}
