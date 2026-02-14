import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { HandoffCard } from "@/components/HandoffCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Mic,
  Search,
  User,
  ClipboardList,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Patient = Tables<"patients">;
type HandoffReport = Tables<"handoff_reports"> & {
  patients?: { name: string } | null;
};

export default function Handoff() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    searchParams.get("patient")
  );
  const [reports, setReports] = useState<HandoffReport[]>([]);
  const [reportCounts, setReportCounts] = useState<Record<string, number>>(
    {}
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatients();
    fetchAllReportCounts();

    const channel = supabase
      .channel("handoff-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "handoff_reports" },
        () => {
          fetchReports(selectedPatientId);
          fetchAllReportCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      fetchReports(selectedPatientId);
      setSearchParams({ patient: selectedPatientId });
    } else {
      setReports([]);
    }
  }, [selectedPatientId]);

  const fetchPatients = async () => {
    const { data } = await supabase
      .from("patients")
      .select("*")
      .is("discharge_date", null)
      .order("name");
    if (data) setPatients(data);
    setLoading(false);
  };

  const fetchReports = async (patientId: string | null) => {
    if (!patientId) return;
    const { data } = await supabase
      .from("handoff_reports")
      .select("*, patients(name)")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setReports(data as HandoffReport[]);
  };

  const fetchAllReportCounts = async () => {
    const { data } = await supabase
      .from("handoff_reports")
      .select("patient_id");
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((r) => {
        counts[r.patient_id] = (counts[r.patient_id] || 0) + 1;
      });
      setReportCounts(counts);
    }
  };

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <AppLayout>
      <div className="flex flex-col gap-5 p-8 lg:px-10 h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[28px] font-semibold text-foreground">
            {t('handoff.title')}
          </h2>
        </div>

        {/* Split layout */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Patient List */}
          <div className="w-[280px] shrink-0 glass-card rounded-2xl flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 px-4 h-11 border-b border-[var(--c-border)]">
              <Search className="w-3.5 h-3.5 text-[var(--c-text-dim)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('handoff.searchPatients')}
                className="bg-transparent text-[12px] text-foreground placeholder:text-[var(--c-text-dim)] focus:outline-none w-full"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredPatients.length === 0 ? (
                <div className="p-4 text-center text-[12px] text-[var(--c-text-muted)]">
                  {t('handoff.noActivePatients')}
                </div>
              ) : (
                filteredPatients.map((p) => {
                  const count = reportCounts[p.id] || 0;
                  const isSelected = selectedPatientId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPatientId(p.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 flex items-center gap-2.5 transition-colors border-l-2",
                        isSelected
                          ? "bg-white/[0.03] border-l-primary"
                          : "hover:bg-white/[0.02] border-l-transparent"
                      )}
                    >
                      <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-[var(--c-text-muted)]">
                          {p.diagnosis || t('handoff.noDiagnosis')}
                          {p.age && ` · ${p.age}yo`}
                        </p>
                      </div>
                      {count > 0 && (
                        <span className="shrink-0 text-[10px] font-medium bg-[var(--c-border)] text-[var(--c-text-secondary)] px-1.5 py-0.5 rounded-full">
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Handoff History */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {selectedPatient ? (
              <>
                {/* Patient header */}
                <div className="glass-card rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {selectedPatient.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-display text-lg font-semibold text-foreground truncate">
                        {selectedPatient.name}
                      </h2>
                      <p className="text-[11px] text-[var(--c-text-muted)]">
                        {selectedPatient.age &&
                          `${selectedPatient.age} yrs`}
                        {selectedPatient.gender &&
                          ` · ${selectedPatient.gender}`}
                        {selectedPatient.diagnosis &&
                          ` · ${selectedPatient.diagnosis}`}
                      </p>
                    </div>
                  </div>
                  {(role === "admin" || role === "staff") && (
                    <button
                      onClick={() =>
                        navigate(
                          `/recordings?patient=${selectedPatient.id}`
                        )
                      }
                      className="flex items-center gap-1.5 gradient-primary rounded-[10px] h-9 px-3.5 text-white text-[12px] font-medium hover:opacity-90 transition-opacity shrink-0"
                    >
                      <Mic className="w-3.5 h-3.5" /> {t('handoff.recordHandoff')}
                    </button>
                  )}
                </div>

                {/* Reports list */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {reports.length === 0 ? (
                    <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-16 text-[var(--c-text-muted)]">
                      <ClipboardList className="w-10 h-10 mb-2 opacity-40" />
                      <p className="text-[13px]">{t('handoff.noReportsYet')}</p>
                      <p className="text-[11px] mt-1">
                        {t('handoff.noReportsHint')}
                      </p>
                    </div>
                  ) : (
                    reports.map((report) => (
                      <HandoffCard key={report.id} report={report} />
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-[var(--c-text-muted)]">
                <User className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-[13px] font-medium">{t('handoff.selectPatient')}</p>
                <p className="text-[11px] mt-1">
                  {t('handoff.selectPatientDesc')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
