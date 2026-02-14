import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  BedDouble,
  ListTodo,
  Mic,
  ArrowRight,
  Clock,
  User,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks"> & { patients?: { name: string } | null };
type AudioNotice = Tables<"audio_notices"> & {
  patients?: { name: string } | null;
};

const priorityStyles: Record<string, string> = {
  low: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]",
  medium: "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]",
  high: "bg-destructive/15 text-destructive",
};

const statusStyles: Record<string, string> = {
  pending: "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]",
  in_progress: "bg-primary/15 text-primary",
  completed: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]",
};

export default function Dashboard() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    patients: 0,
    beds: 0,
    availableBeds: 0,
    tasks: 0,
    recordings: 0,
    unprocessed: 0,
  });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [recentRecordings, setRecentRecordings] = useState<AudioNotice[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [p, b, t, r, unprocessed, tasks, recordings] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("beds").select("id", { count: "exact", head: true }),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("audio_notices")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("audio_notices")
          .select("id", { count: "exact", head: true })
          .eq("processed", false),
        supabase
          .from("tasks")
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
        tasks: t.count ?? 0,
        recordings: r.count ?? 0,
        unprocessed: unprocessed.count ?? 0,
      });
      if (tasks.data) setRecentTasks(tasks.data as Task[]);
      if (recordings.data)
        setRecentRecordings(recordings.data as AudioNotice[]);
    };
    fetchData();
  }, []);

  const cards = [
    {
      title: "Patients",
      value: stats.patients,
      subtitle: "Total registered",
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
      path: "/patients",
    },
    {
      title: "Beds Available",
      value: `${stats.availableBeds}/${stats.beds}`,
      subtitle: "Available / Total",
      icon: BedDouble,
      color: "text-accent",
      bgColor: "bg-accent/10",
      path: "/beds",
    },
    {
      title: "Pending Tasks",
      value: stats.tasks,
      subtitle: "Awaiting action",
      icon: ListTodo,
      color: "text-[hsl(var(--warning))]",
      bgColor: "bg-[hsl(var(--warning))]/10",
      path: "/tasks",
    },
    {
      title: "Recordings",
      value: stats.recordings,
      subtitle: stats.unprocessed > 0
        ? `${stats.unprocessed} unprocessed`
        : "All processed",
      icon: Mic,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      path: "/recordings",
    },
  ];

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-muted-foreground">
            Welcome to CareFlow — your hospital operations at a glance.
          </p>
          {(role === "admin" || role === "staff") && (
            <Button
              onClick={() => navigate("/recordings")}
              className="gap-2"
              size="lg"
            >
              <Mic className="w-4 h-4" />
              Record & Generate Tasks
              <Sparkles className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card
              key={card.title}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => navigate(card.path)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div
                  className={`w-8 h-8 rounded-lg ${card.bgColor} flex items-center justify-center`}
                >
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  {card.subtitle}
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Tasks */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Tasks</CardTitle>
                <button
                  onClick={() => navigate("/tasks")}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {recentTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No tasks yet
                </p>
              ) : (
                <div className="space-y-3">
                  {recentTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 group cursor-pointer"
                      onClick={() => navigate("/tasks")}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${priorityStyles[task.priority]}`}
                          >
                            {task.priority}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${statusStyles[task.status]}`}
                          >
                            {task.status.replace("_", " ")}
                          </Badge>
                          {task.patients?.name && (
                            <span className="text-[10px] text-muted-foreground">
                              · {task.patients.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(task.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Recordings */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Recordings</CardTitle>
                {(role === "admin" || role === "staff") && (
                  <button
                    onClick={() => navigate("/recordings")}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {recentRecordings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No recordings yet
                </p>
              ) : (
                <div className="space-y-3">
                  {recentRecordings.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() =>
                        (role === "admin" || role === "staff") &&
                        navigate("/recordings")
                      }
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          rec.processed
                            ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
                            : "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]"
                        }`}
                      >
                        <Mic className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {rec.patients?.name ?? "Unknown Patient"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {rec.processed ? "Processed" : "Awaiting processing"}
                          {rec.duration_seconds != null &&
                            ` · ${Math.floor(rec.duration_seconds / 60)}:${(rec.duration_seconds % 60).toString().padStart(2, "0")}`}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(rec.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
