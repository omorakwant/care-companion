import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { AcceptButton } from "@/components/handoff/AcceptButton";
import {
  AlertTriangle,
  Brain,
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

export function HandoffCard({
  report,
  onToggleTodo,
  className,
}: HandoffCardProps) {
  const { t } = useTranslation();
  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    () =>
      new Array((report.to_do_items as string[])?.length ?? 0).fill(false)
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
        "glass-card rounded-2xl overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[var(--c-border)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {report.shift_type === "night" ? (
            <div className="w-7 h-7 rounded-[8px] bg-[var(--c-indigo)]/10 flex items-center justify-center">
              <Moon className="w-3.5 h-3.5 text-[var(--c-indigo-light)]" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-[8px] bg-warning/10 flex items-center justify-center">
              <Sun className="w-3.5 h-3.5 text-[var(--c-warning)]" />
            </div>
          )}
          <span
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wider",
              report.shift_type === "night"
                ? "text-[var(--c-indigo-light)]"
                : "text-[var(--c-warning)]"
            )}
          >
            {report.shift_type === "night" ? t('handoffCard.nightShift') : t('handoffCard.dayShift')}
          </span>
        </div>
        <span className="text-[11px] text-[var(--c-text-muted)]">
          {new Date(report.created_at).toLocaleDateString()} ·{" "}
          {new Date(report.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Risk Banner */}
      {riskFactors.length > 0 && (
        <div className="px-5 py-2.5 bg-destructive/15 border-b border-destructive/10 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
          <span className="text-[12px] font-medium text-destructive">
            {riskFactors.join(" · ")}
          </span>
        </div>
      )}

      {/* Vitals */}
      <div className="px-5 py-3 border-b border-[var(--c-border)] flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Droplets className="w-3.5 h-3.5 text-[var(--c-text-muted)]" />
          <span className="text-[11px] text-[var(--c-text-muted)]">{t('handoffCard.pain')}:</span>
          {report.pain_level != null ? (
            <span
              className={cn(
                "text-[11px] font-bold px-1.5 py-0.5 rounded",
                report.pain_level >= 7
                  ? "bg-destructive/10 text-destructive"
                  : report.pain_level >= 4
                    ? "bg-warning/10 text-[var(--c-warning)]"
                    : "bg-accent/10 text-[var(--c-accent)]"
              )}
            >
              {report.pain_level}/10
            </span>
          ) : (
            <span className="text-[11px] text-[var(--c-text-muted)]">{t('handoffCard.na')}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-[var(--c-text-muted)]" />
          <span className="text-[11px] text-[var(--c-text-muted)]">{t('handoffCard.level')}:</span>
          <span
            className={cn(
              "text-[11px] font-medium px-1.5 py-0.5 rounded",
              report.consciousness === "Alert"
                ? "bg-accent/10 text-[var(--c-accent)]"
                : report.consciousness === "Drowsy"
                  ? "bg-warning/10 text-[var(--c-warning)]"
                  : report.consciousness === "Confused"
                    ? "bg-[var(--c-orange)]/10 text-[var(--c-orange)]"
                    : report.consciousness === "Sedated"
                      ? "bg-primary/10 text-[var(--c-primary)]"
                      : "bg-destructive/10 text-destructive"
            )}
          >
            {report.consciousness || t('handoffCard.na')}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Summary */}
        {report.summary_text && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-[var(--c-text-muted)]" />
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--c-text-muted)]">
                {t('handoffCard.summary')}
              </h4>
            </div>
            <p className="text-[13px] text-[var(--c-text-secondary)] leading-relaxed">
              {report.summary_text}
            </p>
          </div>
        )}

        {/* Access Lines */}
        {accessLines.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Cable className="w-3.5 h-3.5 text-[var(--c-text-muted)]" />
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--c-text-muted)]">
                {t('handoffCard.accessLines')}
              </h4>
            </div>
            <ul className="space-y-1">
              {accessLines.map((line, i) => (
                <li
                  key={i}
                  className="text-[13px] text-[var(--c-text-secondary)] flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-primary)] shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pending Labs */}
        {pendingLabs.length > 0 && (
          <div className="bg-warning/5 rounded-[10px] p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-[var(--c-warning)]" />
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--c-warning)]">
                {t('handoffCard.pendingLabs')}
              </h4>
            </div>
            <ul className="space-y-1">
              {pendingLabs.map((lab, i) => (
                <li
                  key={i}
                  className="text-[13px] text-[var(--c-warning)] flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-warning)] shrink-0" />
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
              <CheckSquare className="w-3.5 h-3.5 text-[var(--c-text-muted)]" />
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--c-text-muted)]">
                {t('handoffCard.todoNextNurse')}
              </h4>
            </div>
            <ul className="space-y-1.5">
              {todoItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 group">
                  <button
                    onClick={() => handleToggle(i)}
                    className="shrink-0 mt-0.5 text-[var(--c-text-muted)] hover:text-[var(--c-primary)] transition-colors"
                  >
                    {checkedItems[i] ? (
                      <CheckSquare className="w-4 h-4 text-[var(--c-accent)]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                  <span
                    className={cn(
                      "text-[13px] text-[var(--c-text-secondary)] leading-snug",
                      checkedItems[i] && "line-through text-[var(--c-text-dim)]"
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

      {/* Handoff Acceptance */}
      <div className="px-5 pb-5">
        <AcceptButton handoffId={report.id} />
      </div>
    </div>
  );
}
