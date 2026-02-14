import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ListTodo, Search } from "lucide-react";
import type { Tables, Database } from "@/integrations/supabase/types";

type Task = Tables<"tasks"> & { patients?: { name: string } | null };
type TaskStatus = Database["public"]["Enums"]["task_status"];
type TaskPriority = Database["public"]["Enums"]["task_priority"];

const priorityStyles: Record<TaskPriority, string> = {
  low: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]",
  medium: "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]",
  high: "bg-destructive/15 text-destructive",
};

const statusStyles: Record<TaskStatus, string> = {
  pending: "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]",
  in_progress: "bg-primary/15 text-primary",
  completed: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]",
};

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*, patients(name)")
      .order("created_at", { ascending: false });
    if (data) setTasks(data as Task[]);
  };

  useEffect(() => { fetchTasks(); }, []);

  const updateStatus = async (id: string, status: TaskStatus) => {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    fetchTasks();
  };

  const filtered = tasks.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppLayout title="Tasks">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ListTodo className="w-10 h-10 mb-2" />
              <p>No tasks found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{task.title}</h3>
                      <Badge variant="outline" className={priorityStyles[task.priority]}>{task.priority}</Badge>
                      <Badge variant="outline" className={statusStyles[task.status]}>
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                    {task.description && <p className="text-sm text-muted-foreground truncate">{task.description}</p>}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {task.patients?.name && <span>Patient: {task.patients.name}</span>}
                      {task.category && <span>· {task.category}</span>}
                      <span>· {new Date(task.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Select value={task.status} onValueChange={(v) => updateStatus(task.id, v as TaskStatus)}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
