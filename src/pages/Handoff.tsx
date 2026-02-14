import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { HandoffCard } from "@/components/HandoffCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Mic,
  Search,
  User,
  ClipboardList,
  Moon,
  Sun,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Patient = Tables<"patients">;
type HandoffReport = Tables<"handoff_reports"> & {
  patients?: { name: string } | null;
};

export default function Handoff() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    searchParams.get("patient")
  );
  const [reports, setReports] = useState<HandoffReport[]>([]);
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatients();
    fetchAllReportCounts();

    // Realtime subscription for new handoff reports
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
    <AppLayout title="Shift Handoff">
      <div className="flex gap-5 h-[calc(100vh-8rem)]">
        {/* Left: Patient List */}
        <div className="w-72 shrink-0 bg-card border rounded-lg flex flex-col overflow-hidden">
          <div className="p-3 border-b space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Patients
            </h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredPatients.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No active patients
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
                      "w-full text-left px-3 py-2.5 border-b border-border/50 flex items-center gap-2.5 transition-colors",
                      isSelected
                        ? "bg-primary/5 border-l-2 border-l-primary"
                        : "hover:bg-muted/30 border-l-2 border-l-transparent"
                    )}
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.diagnosis || "No diagnosis"}
                        {p.age && ` · ${p.age}yo`}
                      </p>
                    </div>
                    {count > 0 && (
                      <span className="shrink-0 text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded-full">
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
        <div className="flex-1 flex flex-col min-w-0">
          {selectedPatient ? (
            <>
              {/* Patient header */}
              <div className="bg-card border rounded-lg p-4 mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {selectedPatient.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold truncate">
                      {selectedPatient.name}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedPatient.age && `${selectedPatient.age} yrs`}
                      {selectedPatient.gender &&
                        ` · ${selectedPatient.gender}`}
                      {selectedPatient.diagnosis &&
                        ` · ${selectedPatient.diagnosis}`}
                    </p>
                  </div>
                </div>
                {(role === "admin" || role === "staff") && (
                  <Button
                    onClick={() =>
                      navigate(
                        `/recordings?patient=${selectedPatient.id}`
                      )
                    }
                    className="gap-1.5 shrink-0"
                  >
                    <Mic className="w-4 h-4" /> Record Shift Handoff
                  </Button>
                )}
              </div>

              {/* Reports list */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {reports.length === 0 ? (
                  <div className="bg-card border rounded-lg flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <ClipboardList className="w-10 h-10 mb-2 opacity-40" />
                    <p className="text-sm">No handoff reports yet</p>
                    <p className="text-xs mt-1">
                      Record a shift handoff to generate the first report
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
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <User className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Select a patient</p>
              <p className="text-xs mt-1">
                Choose a patient from the list to view their handoff history
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
