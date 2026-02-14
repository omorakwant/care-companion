import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ListTodo, Search, Plus, Mic, Calendar, User } from "lucide-react";
import type { Tables, Database } from "@/integrations/supabase/types";

type Task = Tables<"tasks"> & { patients?: { name: string } | null };
type Patient = Tables<"patients">;
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
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    category: "",
    patient_id: "",
  });

  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*, patients(name)")
      .order("created_at", { ascending: false });
    if (data) setTasks(data as Task[]);
  };

  const fetchPatients = async () => {
    const { data } = await supabase
      .from("patients")
      .select("id, name")
      .order("name");
    if (data) setPatients(data as Patient[]);
  };

  useEffect(() => {
    fetchTasks();
    fetchPatients();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("tasks").insert({
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      category: form.category || null,
      patient_id: form.patient_id || null,
      created_by: user.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Task created");
    setDialogOpen(false);
    setForm({
      title: "",
      description: "",
      priority: "medium",
      category: "",
      patient_id: "",
    });
    fetchTasks();
  };

  const updateStatus = async (id: string, status: TaskStatus) => {
    const { error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update status: " + error.message);
      return;
    }
    toast.success(`Task marked as ${status.replace("_", " ")}`);
    // Update selected task immediately for instant feedback
    if (selectedTask?.id === id) {
      setSelectedTask((prev) => (prev ? { ...prev, status } : null));
    }
    await fetchTasks();
  };

  const filtered = tasks.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <AppLayout title="Tasks">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> New Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    required
                    placeholder="e.g. Administer medication"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={3}
                    placeholder="Task details..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={form.priority}
                      onValueChange={(v) =>
                        setForm({ ...form, priority: v as TaskPriority })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value })
                      }
                      placeholder="e.g. Medication"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Patient (optional)</Label>
                  <Select
                    value={form.patient_id}
                    onValueChange={(v) =>
                      setForm({ ...form, patient_id: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a patient..." />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  Create Task
                </Button>
              </form>
            </DialogContent>
          </Dialog>
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
              <Card
                key={task.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedTask(task)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{task.title}</h3>
                      <Badge
                        variant="outline"
                        className={priorityStyles[task.priority]}
                      >
                        {task.priority}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={statusStyles[task.status]}
                      >
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {task.patients?.name && (
                        <span>Patient: {task.patients.name}</span>
                      )}
                      {task.category && <span>· {task.category}</span>}
                      <span>
                        · {new Date(task.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={task.status}
                      onValueChange={(v) =>
                        updateStatus(task.id, v as TaskStatus)
                      }
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Task Detail Sheet */}
        <Sheet
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
        >
          <SheetContent className="sm:max-w-lg overflow-y-auto">
            {selectedTask && (
              <>
                <SheetHeader>
                  <SheetTitle className="text-left">
                    {selectedTask.title}
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-5">
                  {/* Status & Priority */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={priorityStyles[selectedTask.priority]}
                    >
                      {selectedTask.priority} priority
                    </Badge>
                    <Badge
                      variant="outline"
                      className={statusStyles[selectedTask.status]}
                    >
                      {selectedTask.status.replace("_", " ")}
                    </Badge>
                  </div>

                  {/* Description */}
                  {selectedTask.description && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Description
                      </p>
                      <p className="text-sm">{selectedTask.description}</p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="space-y-3">
                    {selectedTask.patients?.name && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>Patient: {selectedTask.patients.name}</span>
                      </div>
                    )}
                    {selectedTask.category && (
                      <div className="flex items-center gap-2 text-sm">
                        <ListTodo className="w-4 h-4 text-muted-foreground" />
                        <span>Category: {selectedTask.category}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>
                        Created:{" "}
                        {new Date(selectedTask.created_at).toLocaleString()}
                      </span>
                    </div>
                    {selectedTask.audio_notice_id && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mic className="w-4 h-4 text-muted-foreground" />
                        <span>Created from audio recording</span>
                      </div>
                    )}
                  </div>

                  {/* Transcript Excerpt */}
                  {selectedTask.transcript_excerpt && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Transcript Excerpt
                      </p>
                      <div className="bg-muted/50 rounded-md p-3 text-sm italic border-l-2 border-primary">
                        "{selectedTask.transcript_excerpt}"
                      </div>
                    </div>
                  )}

                  {/* Update Status */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Update Status
                    </p>
                    <Select
                      value={selectedTask.status}
                      onValueChange={(v) =>
                        updateStatus(selectedTask.id, v as TaskStatus)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AppLayout>
  );
}
