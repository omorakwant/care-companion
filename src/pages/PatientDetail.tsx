import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit2,
  Save,
  Trash2,
  BedDouble,
  ListTodo,
  Mic,
  X,
  Clock,
  Calendar,
} from "lucide-react";
import type { Tables, Database } from "@/integrations/supabase/types";

type Patient = Tables<"patients">;
type Task = Tables<"tasks">;
type AudioNotice = Tables<"audio_notices">;
type Bed = Tables<"beds">;
type TaskStatus = Database["public"]["Enums"]["task_status"];

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

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recordings, setRecordings] = useState<AudioNotice[]>([]);
  const [bed, setBed] = useState<Bed | null>(null);
  const [allBeds, setAllBeds] = useState<Bed[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    diagnosis: "",
    notes: "",
    discharge_date: "",
  });
  const [loading, setLoading] = useState(true);

  const canEdit = role === "admin" || role === "staff";
  const canDelete = role === "admin";
  const canManageBeds = role === "admin" || role === "receptionist";

  const fetchPatient = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) {
      toast.error("Patient not found");
      navigate("/patients");
      return;
    }
    setPatient(data);
    setForm({
      name: data.name,
      age: data.age?.toString() ?? "",
      gender: data.gender ?? "",
      diagnosis: data.diagnosis ?? "",
      notes: data.notes ?? "",
      discharge_date: data.discharge_date ?? "",
    });
  };

  const fetchRelated = async () => {
    if (!id) return;
    const [tasksRes, recordingsRes, bedRes, allBedsRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("audio_notices")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("beds").select("*").eq("patient_id", id).maybeSingle(),
      supabase
        .from("beds")
        .select("*")
        .or("status.eq.available,patient_id.eq." + id)
        .order("bed_number"),
    ]);
    if (tasksRes.data) setTasks(tasksRes.data);
    if (recordingsRes.data) setRecordings(recordingsRes.data);
    if (bedRes.data) setBed(bedRes.data);
    if (allBedsRes.data) setAllBeds(allBedsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPatient();
    fetchRelated();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    const { error } = await supabase
      .from("patients")
      .update({
        name: form.name,
        age: form.age ? parseInt(form.age) : null,
        gender: form.gender || null,
        diagnosis: form.diagnosis || null,
        notes: form.notes || null,
        discharge_date: form.discharge_date || null,
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Patient updated");
    setEditing(false);
    fetchPatient();
  };

  const handleDelete = async () => {
    if (!id) return;
    const { error } = await supabase.from("patients").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Patient deleted");
    navigate("/patients");
  };

  const assignBed = async (bedId: string) => {
    if (!id) return;
    // Unassign current bed if any
    if (bed) {
      await supabase
        .from("beds")
        .update({ patient_id: null, status: "available" as const })
        .eq("id", bed.id);
    }
    if (bedId === "none") {
      setBed(null);
      fetchRelated();
      toast.success("Bed unassigned");
      return;
    }
    const { error } = await supabase
      .from("beds")
      .update({ patient_id: id, status: "occupied" as const })
      .eq("id", bedId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bed assigned");
    fetchRelated();
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    const { error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", taskId);
    if (error) {
      toast.error(error.message);
      return;
    }
    fetchRelated();
  };

  if (loading) {
    return (
      <AppLayout title="Patient Details">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!patient) return null;

  return (
    <AppLayout title="Patient Details">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/patients")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold truncate">{patient.name}</h2>
            <p className="text-sm text-muted-foreground">
              {patient.age ? `${patient.age} yrs` : ""}{" "}
              {patient.gender ? `· ${patient.gender}` : ""} · Admitted{" "}
              {new Date(patient.admission_date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Quick Record — navigate to Recordings with patient pre-selected */}
            <Button
              size="sm"
              onClick={() => navigate(`/recordings?patient=${id}`)}
              className="gap-1.5"
            >
              <Mic className="w-4 h-4" /> Record Notes
            </Button>
            {canEdit &&
              (!editing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  <Edit2 className="w-4 h-4 mr-2" /> Edit
                </Button>
              ) : (
                <>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" /> Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(false);
                      setForm({
                        name: patient.name,
                        age: patient.age?.toString() ?? "",
                        gender: patient.gender ?? "",
                        diagnosis: patient.diagnosis ?? "",
                        notes: patient.notes ?? "",
                        discharge_date: patient.discharge_date ?? "",
                      });
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ))}
            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Patient</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {patient.name} and cannot be
                      undone. Linked tasks and recordings will remain but will be
                      unlinked.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Patient Info Card */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Patient Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <>
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Age</Label>
                        <Input
                          type="number"
                          value={form.age}
                          onChange={(e) =>
                            setForm({ ...form, age: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Gender</Label>
                        <Input
                          value={form.gender}
                          onChange={(e) =>
                            setForm({ ...form, gender: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Diagnosis</Label>
                      <Input
                        value={form.diagnosis}
                        onChange={(e) =>
                          setForm({ ...form, diagnosis: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={form.notes}
                        onChange={(e) =>
                          setForm({ ...form, notes: e.target.value })
                        }
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Discharge Date</Label>
                      <Input
                        type="date"
                        value={form.discharge_date}
                        onChange={(e) =>
                          setForm({ ...form, discharge_date: e.target.value })
                        }
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-3">
                      {patient.diagnosis && (
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Diagnosis
                          </p>
                          <Badge variant="secondary">{patient.diagnosis}</Badge>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Age</p>
                          <p className="text-sm font-medium">
                            {patient.age ?? "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Gender
                          </p>
                          <p className="text-sm font-medium">
                            {patient.gender ?? "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Admitted
                          </p>
                          <p className="text-sm font-medium">
                            {new Date(
                              patient.admission_date
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Discharged
                          </p>
                          <p className="text-sm font-medium">
                            {patient.discharge_date
                              ? new Date(
                                  patient.discharge_date
                                ).toLocaleDateString()
                              : "Active"}
                          </p>
                        </div>
                      </div>
                      {patient.notes && (
                        <div>
                          <p className="text-xs text-muted-foreground">Notes</p>
                          <p className="text-sm">{patient.notes}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Bed Assignment Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BedDouble className="w-4 h-4" /> Bed Assignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bed ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        Bed {bed.bed_number}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {bed.ward} Ward
                      </p>
                    </div>
                    {canManageBeds && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => assignBed("none")}
                      >
                        Unassign
                      </Button>
                    )}
                  </div>
                ) : canManageBeds ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      No bed assigned
                    </p>
                    <Select onValueChange={assignBed}>
                      <SelectTrigger>
                        <SelectValue placeholder="Assign a bed..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allBeds
                          .filter((b) => b.status === "available")
                          .map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.bed_number} ({b.ward})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No bed assigned
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Tasks & Recordings */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="tasks">
              <TabsList>
                <TabsTrigger value="tasks" className="gap-1.5">
                  <ListTodo className="w-3.5 h-3.5" /> Tasks ({tasks.length})
                </TabsTrigger>
                <TabsTrigger value="recordings" className="gap-1.5">
                  <Mic className="w-3.5 h-3.5" /> Recordings (
                  {recordings.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tasks" className="mt-4 space-y-2">
                {tasks.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <ListTodo className="w-8 h-8 mb-2" />
                      <p className="text-sm">No tasks for this patient</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => navigate("/tasks")}
                      >
                        Create a task
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  tasks.map((task) => (
                    <Card key={task.id}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm truncate">
                              {task.title}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`text-xs ${priorityStyles[task.priority]}`}
                            >
                              {task.priority}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${statusStyles[task.status]}`}
                            >
                              {task.status.replace("_", " ")}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {task.description}
                            </p>
                          )}
                          {task.transcript_excerpt && (
                            <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
                              "{task.transcript_excerpt.slice(0, 120)}..."
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {task.category && `${task.category} · `}
                            {new Date(task.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Select
                          value={task.status}
                          onValueChange={(v) =>
                            updateTaskStatus(task.id, v as TaskStatus)
                          }
                        >
                          <SelectTrigger className="w-[120px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">
                              In Progress
                            </SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="recordings" className="mt-4 space-y-2">
                {recordings.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <Mic className="w-8 h-8 mb-2" />
                      <p className="text-sm">No recordings for this patient</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => navigate("/recordings")}
                      >
                        Record audio
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  recordings.map((rec) => (
                    <Card key={rec.id}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {new Date(rec.created_at).toLocaleString()}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {rec.processed ? (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
                                >
                                  Processed
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]"
                                >
                                  Awaiting processing
                                </Badge>
                              )}
                              {rec.duration_seconds && (
                                <span className="text-xs text-muted-foreground">
                                  {Math.floor(rec.duration_seconds / 60)}:
                                  {(rec.duration_seconds % 60)
                                    .toString()
                                    .padStart(2, "0")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {rec.transcript && (
                          <div className="bg-muted/50 rounded-md p-3 text-sm">
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Transcript
                            </p>
                            <p className="text-sm">{rec.transcript}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
