import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Scan,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  ThermometerSun,
} from "lucide-react";

export interface WoundAnalysis {
  wound_type: string;
  approximate_size_cm: string;
  infection_signs: {
    erythema: boolean;
    pus: boolean;
    odor: boolean;
    warmth: boolean;
  };
  healing_stage: string;
  severity: string;
  drainage: string;
  recommendations: string[];
}

export interface WoundCardProps {
  entry: {
    id: string;
    image_url: string;
    analysis_json: WoundAnalysis | null;
    doctor_notes: string;
    created_at: string;
  };
  onAnalyze?: (id: string) => void;
  analyzing?: boolean;
}

const INFECTION_SIGNS: { key: keyof WoundAnalysis["infection_signs"]; icon: typeof CheckCircle2 }[] = [
  { key: "erythema", icon: AlertTriangle },
  { key: "pus", icon: Droplets },
  { key: "odor", icon: AlertTriangle },
  { key: "warmth", icon: ThermometerSun },
];

export function WoundCard({ entry, onAnalyze, analyzing }: WoundCardProps) {
  const { t } = useTranslation();
  // analysis_json can be {} (empty), null, or a full WoundAnalysis
  const raw = entry.analysis_json;
  const analysis: WoundAnalysis | null =
    raw && typeof raw === "object" && "wound_type" in raw ? (raw as WoundAnalysis) : null;

  const severityStyles: Record<string, string> = {
    mild: "bg-accent/10 text-[var(--c-accent)]",
    moderate: "bg-warning/10 text-[var(--c-warning)]",
    severe: "bg-destructive/10 text-[var(--c-danger)]",
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col">
      <div className="flex flex-col sm:flex-row">
        {/* Left: Image (40%) */}
        <div className="w-full sm:w-[40%] shrink-0 p-4 sm:p-5">
        <div className="relative aspect-[4/3] sm:aspect-auto sm:max-h-[200px] rounded-xl overflow-hidden bg-[var(--c-surface-alt)]">
          <img
            src={entry.image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Right: Analysis (60%) */}
      <div className="flex-1 min-w-0 p-4 sm:p-5 pt-0 sm:pt-5 flex flex-col gap-4">
        {/* Date - top right */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0" />
          <span className="text-[11px] text-[var(--c-text-muted)] shrink-0">
            {new Date(entry.created_at).toLocaleDateString()} ·{" "}
            {new Date(entry.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {analysis ? (
          <>
            {/* Severity badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider",
                  severityStyles[analysis.severity?.toLowerCase()] ??
                    severityStyles.moderate
                )}
              >
                <AlertTriangle className="w-3 h-3" />
                {analysis.severity}
              </span>
            </div>

            {/* Wound type and size */}
            <div className="space-y-1">
              <p className="text-[13px] font-medium text-foreground">
                {t("wound.type")}: {analysis.wound_type}
              </p>
              <p className="text-[12px] text-[var(--c-text-secondary)]">
                {t("wound.size")}: {analysis.approximate_size_cm}
              </p>
            </div>

            {/* Healing stage */}
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[var(--c-text-muted)] shrink-0" />
              <span className="text-[12px] text-[var(--c-text-secondary)]">
                {t("wound.healingStage")}: {analysis.healing_stage}
              </span>
            </div>

            {/* Infection signs grid */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--c-text-muted)] mb-2">
                {t("wound.infectionSigns")}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {INFECTION_SIGNS.map(({ key }) => {
                  const detected = analysis.infection_signs?.[key] ?? false;
                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium",
                        detected
                          ? "bg-destructive/10 text-[var(--c-danger)]"
                          : "bg-accent/10 text-[var(--c-accent)]"
                      )}
                    >
                      {detected ? (
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                      )}
                      {t(`wound.infection.${key}`)}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Drainage */}
            {analysis.drainage && (
              <div className="flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-[var(--c-text-muted)] shrink-0" />
                <span className="text-[12px] text-[var(--c-text-secondary)]">
                  {t("wound.drainage")}: {analysis.drainage}
                </span>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations?.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--c-text-muted)] mb-1.5">
                  {t("wound.recommendations")}
                </p>
                <ul className="space-y-1">
                  {analysis.recommendations.map((rec, i) => (
                    <li
                      key={i}
                      className="text-[12px] text-[var(--c-text-secondary)] flex items-start gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-primary)] shrink-0 mt-1.5" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
            <Scan className="w-10 h-10 text-[var(--c-text-muted)] mb-3 opacity-60" />
            <p className="text-[13px] text-[var(--c-text-secondary)] mb-4">
              {t("wound.noAnalysis")}
            </p>
            <button
              onClick={() => onAnalyze?.(entry.id)}
              disabled={analyzing}
              className="flex items-center gap-2 gradient-primary rounded-[10px] h-9 px-4 text-white text-[12px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Scan className="w-3.5 h-3.5" />
              {analyzing ? t("wound.analyzing") : t("wound.analyzeWithAI")}
            </button>
          </div>
        )}
      </div>
      </div>

      {/* Doctor notes - full width below */}
      {entry.doctor_notes && (
        <div className="w-full border-t border-[var(--c-border)] px-4 sm:px-5 py-3 sm:py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--c-text-muted)] mb-1.5">
            {t("wound.doctorNotes")}
          </p>
          <p className="text-[13px] text-[var(--c-text-secondary)] leading-relaxed">
            {entry.doctor_notes}
          </p>
        </div>
      )}
    </div>
  );
}
