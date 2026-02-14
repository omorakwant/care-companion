import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Brain,
  Clock,
  Droplets,
  Moon,
  Sun,
  Stethoscope,
  FlaskConical,
  Cable,
  CheckSquare,
  Square,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type HandoffReport = Tables<"handoff_reports"> & {
  patients?: { name: string } | null;
  profiles?: { display_name: string } | null;
};

interface HandoffCardProps {
  report: HandoffReport;
  onToggleTodo?: (reportId: string, index: number, checked: boolean) => void;
  className?: string;
}

export function HandoffCard({ report, onToggleTodo, className }: HandoffCardProps) {
  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    () => new Array((report.to_do_items as string[])?.length ?? 0).fill(false)
  );

  const riskFactors = (report.risk_factors as string[]) ?? [];
  const pendingLabs = (report.pending_labs as string[]) ?? [];
  const accessLines = (report.access_lines as string[]) ?? [];
  const todoItems = (report.to_do_items as string[]) ?? [];

  const handleToggle = (index: number) => {
    const updated = [...checkedItems];
    updated[index] = !updated[index];
    setCheckedItems(updated);
    onToggleTodo?.(report.id, index, updated[index]);
  };

  return (
    <div
      className={cn(
        "bg-card border rounded-lg overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {report.shift_type === "night" ? (
            <div className="w-7 h-7 rounded-md bg-indigo-100 flex items-center justify-center">
              <Moon className="w-3.5 h-3.5 text-indigo-600" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-md bg-amber-100 flex items-center justify-center">
              <Sun className="w-3.5 h-3.5 text-amber-600" />
            </div>
          )}
          <div>
            <span
              className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                report.shift_type === "night"
                  ? "text-indigo-600"
                  : "text-amber-600"
              )}
            >
              {report.shift_type === "night" ? "Night Shift" : "Day Shift"}
            </span>
            <p className="text-[11px] text-muted-foreground">
              {new Date(report.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {new Date(report.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {/* Risk Banner */}
      {riskFactors.length > 0 && (
        <div className="px-5 py-2.5 bg-red-50 border-b border-red-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="text-sm font-medium text-red-700">
            {riskFactors.join(" · ")}
          </span>
        </div>
      )}

      {/* Vitals Grid */}
      <div className="px-5 py-3 border-b flex items-center gap-4 flex-wrap">
        {/* Pain Level */}
        <div className="flex items-center gap-1.5">
          <Droplets className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Pain:</span>
          {report.pain_level != null ? (
            <span
              className={cn(
                "text-xs font-bold px-1.5 py-0.5 rounded",
                report.pain_level >= 7
                  ? "bg-red-100 text-red-700"
                  : report.pain_level >= 4
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
              )}
            >
              {report.pain_level}/10
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">N/A</span>
          )}
        </div>

        {/* Consciousness */}
        <div className="flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Level:</span>
          <span
            className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded",
              report.consciousness === "Alert"
                ? "bg-emerald-100 text-emerald-700"
                : report.consciousness === "Drowsy"
                  ? "bg-amber-100 text-amber-700"
                  : report.consciousness === "Confused"
                    ? "bg-orange-100 text-orange-700"
                    : report.consciousness === "Sedated"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-red-100 text-red-700"
            )}
          >
            {report.consciousness || "N/A"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Summary */}
        {report.summary_text && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-muted-foreground" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Summary
              </h4>
            </div>
            <p className="text-sm leading-relaxed">{report.summary_text}</p>
          </div>
        )}

        {/* Access Lines */}
        {accessLines.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Cable className="w-3.5 h-3.5 text-muted-foreground" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Access / Lines
              </h4>
            </div>
            <ul className="space-y-1">
              {accessLines.map((line, i) => (
                <li
                  key={i}
                  className="text-sm flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pending Labs */}
        {pendingLabs.length > 0 && (
          <div className="bg-amber-50 rounded-md p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Pending Labs / Results
              </h4>
            </div>
            <ul className="space-y-1">
              {pendingLabs.map((lab, i) => (
                <li key={i} className="text-sm text-amber-800 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  {lab}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* To-Do Items */}
        {todoItems.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-muted-foreground" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                To-Do for Next Nurse
              </h4>
            </div>
            <ul className="space-y-1.5">
              {todoItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 group">
                  <button
                    onClick={() => handleToggle(i)}
                    className="shrink-0 mt-0.5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {checkedItems[i] ? (
                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                  <span
                    className={cn(
                      "text-sm leading-snug",
                      checkedItems[i] && "line-through text-muted-foreground"
                    )}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
