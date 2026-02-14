import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, BedDouble, ListTodo, Mic } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { role } = useAuth();
  const [stats, setStats] = useState({ patients: 0, beds: 0, tasks: 0, recordings: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [p, b, t, r] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("beds").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("audio_notices").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        patients: p.count ?? 0,
        beds: b.count ?? 0,
        tasks: t.count ?? 0,
        recordings: r.count ?? 0,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "Patients", value: stats.patients, icon: Users, color: "text-primary" },
    { title: "Beds", value: stats.beds, icon: BedDouble, color: "text-accent" },
    { title: "Pending Tasks", value: stats.tasks, icon: ListTodo, color: "text-[hsl(var(--warning))]" },
    { title: "Recordings", value: stats.recordings, icon: Mic, color: "text-destructive" },
  ];

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">Welcome to CareFlow — your hospital operations at a glance.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
