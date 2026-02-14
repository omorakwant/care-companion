import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  BedDouble,
  ClipboardList,
  Mic,
  ArrowRight,
  Plus,
  Moon,
  Sun,
  AlertTriangle,
  Search,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type HandoffReport = Tables<"handoff_reports"> & {
  patients?: { name: string } | null;
};
type AudioNotice = Tables<"audio_notices"> & {
  patients?: { name: string } | null;
};

export default function Dashboard() {
  const { role, profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    patients: 0,
    beds: 0,
    availableBeds: 0,
    handoffs: 0,
    recordings: 0,
    unprocessed: 0,
  });
  const [recentHandoffs, setRecentHandoffs] = useState<HandoffReport[]>([]);
  const [recentRecordings, setRecentRecordings] = useState<AudioNotice[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [p, b, h, r, unprocessed, handoffs, recordings] =
        await Promise.all([
          supabase
            .from("patients")
            .select("id", { count: "exact", head: true }),
          supabase.from("beds").select("id", { count: "exact", head: true }),
          supabase
            .from("handoff_reports")
            .select("id", { count: "exact", head: true }),
          supabase
            .from("audio_notices")
            .select("id", { count: "exact", head: true }),
          supabase
            .from("audio_notices")
            .select("id", { count: "exact", head: true })
            .eq("processed", false),
          supabase
            .from("handoff_reports")
            .select("*, patients(name)")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("audio_notices")
            .select("*, patients(name)")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

      const availableBeds = await supabase
        .from("beds")
        .select("id", { count: "exact", head: true })
        .eq("status", "available");

      setStats({
        patients: p.count ?? 0,
        beds: b.count ?? 0,
        availableBeds: availableBeds.count ?? 0,
        handoffs: h.count ?? 0,
        recordings: r.count ?? 0,
        unprocessed: unprocessed.count ?? 0,
      });
      if (handoffs.data)
        setRecentHandoffs(handoffs.data as HandoffReport[]);
      if (recordings.data)
        setRecentRecordings(recordings.data as AudioNotice[]);
    };
    fetchData();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('dashboard.goodMorning');
    if (h < 18) return t('dashboard.goodAfternoon');
    return t('dashboard.goodEvening');
  };

  const shiftLabel = () => {
    const h = new Date().getHours();
    if (h >= 7 && h < 15) return t('dashboard.dayShift');
    if (h >= 15 && h < 23) return t('dashboard.eveningShift');
    return t('dashboard.nightShift');
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-7 p-8 lg:px-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-[28px] font-semibold text-foreground">
              {greeting()}, {profile?.display_name ?? "Nurse"}
            </h2>
            <p className="text-xs text-[var(--c-text-muted)]">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              — {shiftLabel()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[var(--c-surface-alt)] rounded-[10px] h-[38px] px-3.5 w-[200px]">
              <Search className="w-3.5 h-3.5 text-[var(--c-text-dim)]" />
              <input
                placeholder={t('dashboard.search')}
                className="bg-transparent text-[12px] text-foreground placeholder:text-[var(--c-text-dim)] focus:outline-none w-full"
              />
            </div>
            {(role === "admin" || role === "staff") && (
              <button
                onClick={() => navigate("/recordings")}
                className="flex items-center gap-2 gradient-primary rounded-[10px] h-[38px] px-4 text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
              >
                <Mic className="w-3.5 h-3.5" /> {t('dashboard.recordHandoff')}
              </button>
            )}
          </div>
        </div>

        {/* Stat Cards Row */}
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => navigate("/patients")}
            className="glass-card rounded-2xl p-5 flex flex-col gap-3 text-left hover:border-white/[0.08] transition-colors"
          >
            <span className="text-[10px] font-medium tracking-[1px] text-[var(--c-text-muted)] uppercase">
              {t('dashboard.activePatients')}
            </span>
            <span className="font-display text-4xl font-bold text-foreground">
              {stats.patients}
            </span>
            <span className="text-[11px] text-[var(--c-accent)]">
              {t('dashboard.activeRecords')}
            </span>
          </button>

          <button
            onClick={() => navigate("/beds")}
            className="glass-card rounded-2xl p-5 flex flex-col gap-3 text-left hover:border-white/[0.08] transition-colors"
          >
            <span className="text-[10px] font-medium tracking-[1px] text-[var(--c-text-muted)] uppercase">
              {t('dashboard.availableBeds')}
            </span>
            <span className="font-display text-4xl font-bold text-foreground">
              {stats.availableBeds}
            </span>
            <span className="text-[11px] text-[var(--c-text-muted)]">
              {t('dashboard.ofTotal', { total: stats.beds })}
            </span>
          </button>

          <button
            onClick={() => navigate("/handoff")}
            className="glass-card rounded-2xl p-5 flex flex-col gap-3 text-left hover:border-white/[0.08] transition-colors"
          >
            <span className="text-[10px] font-medium tracking-[1px] text-[var(--c-text-muted)] uppercase">
              {t('dashboard.handoffReports')}
            </span>
            <span className="font-display text-4xl font-bold text-foreground">
              {stats.handoffs}
            </span>
            <span className="text-[11px] text-[var(--c-primary)]">
              {t('dashboard.totalReports')}
            </span>
          </button>

          <button
            onClick={() => navigate("/recordings")}
            className="gradient-primary rounded-2xl p-5 flex flex-col gap-3 text-left border border-white/[0.06] hover:opacity-95 transition-opacity"
          >
            <span className="text-[10px] font-medium tracking-[1px] text-white/70 uppercase">
              {t('dashboard.recordings')}
            </span>
            <span className="font-display text-4xl font-bold text-white">
              {stats.recordings}
            </span>
            <span className="text-[11px] text-white/80">
              {stats.unprocessed > 0
                ? t('dashboard.unprocessed', { count: stats.unprocessed })
                : t('dashboard.allProcessed')}
            </span>
          </button>
        </div>

        {/* Bento Grid Row 2 */}
        <div className="grid grid-cols-[1fr_340px] gap-4 flex-1 min-h-0">
          {/* Recent Handoffs */}
          <div className="glass-card rounded-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--c-border)]">
              <h3 className="font-display text-base font-semibold text-foreground">
                {t('dashboard.recentHandoffReports')}
              </h3>
              <button
                onClick={() => navigate("/handoff")}
                className="text-[11px] text-[var(--c-primary)] hover:underline flex items-center gap-1"
              >
                {t('dashboard.viewAll')} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {recentHandoffs.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12 text-[13px] text-[var(--c-text-muted)]">
                {t('dashboard.noHandoffReports')}
              </div>
            ) : (
              <div className="flex-1 divide-y divide-[var(--c-border)]">
                {recentHandoffs.map((report) => {
                  const risks = (report.risk_factors as string[]) ?? [];
                  return (
                    <div
                      key={report.id}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] cursor-pointer transition-colors"
                      onClick={() =>
                        navigate(
                          `/handoff?patient=${report.patient_id}`
                        )
                      }
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--c-primary)] to-[var(--c-purple)] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                        {report.patients?.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">
                          {report.patients?.name ?? "Unknown Patient"}
                        </p>
                        <p className="text-[11px] text-[var(--c-text-muted)] truncate">
                          {report.summary_text?.slice(0, 60)}...
                        </p>
                      </div>
                      {risks.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px] font-medium shrink-0">
                          <AlertTriangle className="w-3 h-3" />
                          {risks.length}
                        </span>
                      )}
                      <span className="text-[11px] text-[var(--c-text-muted)] shrink-0">
                        {report.shift_type === "night" ? (
                          <span className="flex items-center gap-1"><Moon className="w-3 h-3 text-indigo-400" /> {t('dashboard.night')}</span>
                        ) : (
                          <span className="flex items-center gap-1"><Sun className="w-3 h-3 text-amber-400" /> {t('dashboard.day')}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Recordings */}
          <div className="glass-card rounded-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--c-border)]">
              <h3 className="font-display text-base font-semibold text-foreground">
                {t('dashboard.recentRecordings')}
              </h3>
            </div>
            {recentRecordings.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12 text-[13px] text-[var(--c-text-muted)]">
                {t('dashboard.noRecordings')}
              </div>
            ) : (
              <div className="flex-1 divide-y divide-[var(--c-border)]">
                {recentRecordings.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] cursor-pointer transition-colors"
                    onClick={() =>
                      (role === "admin" || role === "staff") &&
                      navigate("/recordings")
                    }
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--c-info)] to-[var(--c-primary)] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {rec.patients?.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {rec.patients?.name ?? "Unknown Patient"}
                      </p>
                      <p className="text-[11px] text-[var(--c-text-muted)]">
                        {rec.duration_seconds != null &&
                          `${Math.floor(rec.duration_seconds / 60)}:${(rec.duration_seconds % 60).toString().padStart(2, "0")} · `}
                        {new Date(rec.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full",
                        rec.processed
                          ? "bg-accent/10 text-[var(--c-accent)]"
                          : "bg-warning/10 text-[var(--c-warning)]"
                      )}
                    >
                      {rec.processed ? t('dashboard.processed') : t('dashboard.pending')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/patients")}
            className="flex items-center gap-2 h-9 px-3.5 rounded-[10px] bg-[var(--c-surface-alt)] border border-[var(--c-border)] text-[11px] text-[var(--c-text-secondary)] hover:text-foreground hover:border-white/[0.1] transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--c-text-muted)]" /> {t('dashboard.addPatient')}
          </button>
          <button
            onClick={() => navigate("/handoff")}
            className="flex items-center gap-2 h-9 px-3.5 rounded-[10px] bg-[var(--c-surface-alt)] border border-[var(--c-border)] text-[11px] text-[var(--c-text-secondary)] hover:text-foreground hover:border-white/[0.1] transition-colors"
          >
            <ClipboardList className="w-3.5 h-3.5 text-[var(--c-text-muted)]" /> {t('dashboard.viewHandoffs')}
          </button>
          {(role === "admin" || role === "staff") && (
            <button
              onClick={() => navigate("/recordings")}
              className="flex items-center gap-2 h-9 px-3.5 rounded-[10px] bg-[var(--c-surface-alt)] border border-[var(--c-border)] text-[11px] text-[var(--c-text-secondary)] hover:text-foreground hover:border-white/[0.1] transition-colors"
            >
              <Mic className="w-3.5 h-3.5 text-[var(--c-text-muted)]" /> {t('dashboard.recordHandoff')}
            </button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
