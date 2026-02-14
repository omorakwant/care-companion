import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
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
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* Greeting */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {greeting()}, {profile?.display_name ?? "Nurse"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          {(role === "admin" || role === "staff") && (
            <Button
              onClick={() => navigate("/recordings")}
              className="gap-2"
            >
              <Mic className="w-4 h-4" /> Record Shift Handoff
            </Button>
          )}
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Patients"
            value={stats.patients}
            subtitle="Active patients"
            icon={Users}
            onClick={() => navigate("/patients")}
          />
          <StatCard
            title="Beds Available"
            value={`${stats.availableBeds} / ${stats.beds}`}
            subtitle="Available / Total"
            icon={BedDouble}
            onClick={() => navigate("/beds")}
          />
          <StatCard
            title="Handoff Reports"
            value={stats.handoffs}
            subtitle="Total shift handoffs"
            icon={ClipboardList}
            onClick={() => navigate("/handoff")}
          />
          <StatCard
            title="Recordings"
            value={stats.recordings}
            subtitle={
              stats.unprocessed > 0
                ? `${stats.unprocessed} unprocessed`
                : "All processed"
            }
            icon={Mic}
            onClick={() => navigate("/recordings")}
          />
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Recent Handoff Reports -- wider */}
          <div className="lg:col-span-3 bg-card border rounded-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-sm font-semibold">Recent Handoff Reports</h3>
              <button
                onClick={() => navigate("/handoff")}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            {recentHandoffs.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No handoff reports yet
              </div>
            ) : (
              <div className="divide-y">
                {recentHandoffs.map((report) => {
                  const risks = (report.risk_factors as string[]) ?? [];
                  return (
                    <div
                      key={report.id}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() =>
                        navigate(
                          `/handoff?patient=${report.patient_id}`
                        )
                      }
                    >
                      {report.shift_type === "night" ? (
                        <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
                      ) : (
                        <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {report.patients?.name ?? "Unknown Patient"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {report.summary_text?.slice(0, 80)}...
                        </p>
                      </div>
                      {risks.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-medium shrink-0">
                          <AlertTriangle className="w-3 h-3" />
                          {risks.length}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Recordings */}
          <div className="lg:col-span-2 bg-card border rounded-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-sm font-semibold">Recent Recordings</h3>
            </div>
            {recentRecordings.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No recordings yet
              </div>
            ) : (
              <div className="divide-y">
                {recentRecordings.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() =>
                      (role === "admin" || role === "staff") &&
                      navigate("/recordings")
                    }
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        rec.processed ? "bg-emerald-500" : "bg-amber-500"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {rec.patients?.name ?? "Unknown Patient"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {rec.processed ? "Processed" : "Processing..."}
                        {rec.duration_seconds != null &&
                          ` -- ${Math.floor(rec.duration_seconds / 60)}:${(rec.duration_seconds % 60).toString().padStart(2, "0")}`}
                      </p>
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {new Date(rec.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/patients")}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Patient
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/handoff")}
            className="gap-1.5"
          >
            <ClipboardList className="w-3.5 h-3.5" /> View Handoffs
          </Button>
          {(role === "admin" || role === "staff") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/recordings")}
              className="gap-1.5"
            >
              <Mic className="w-3.5 h-3.5" /> Record Handoff
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
