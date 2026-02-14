import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HandoffCard } from "@/components/HandoffCard";
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
  ClipboardList,
  Mic,
  X,
  Clock,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Patient = Tables<"patients">;
type HandoffReport = Tables<"handoff_reports">;
type AudioNotice = Tables<"audio_notices">;
type Bed = Tables<"beds">;

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [handoffs, setHandoffs] = useState<HandoffReport[]>([]);
  const [recordings, setRecordings] = useState<AudioNotice[]>([]);
  const [bed, setBed] = useState<Bed | null>(null);
  const [allBeds, setAllBeds] = useState<Bed[]>([]);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"handoffs" | "recordings">("handoffs");
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
    const [handoffsRes, recordingsRes, bedRes, allBedsRes] = await Promise.all([
      supabase
        .from("handoff_reports")
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
    if (handoffsRes.data) setHandoffs(handoffsRes.data);
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
        {/* Header Bar */}
        <div className="bg-card border rounded-lg p-5">
          <div className="flex items-start gap-4 flex-wrap">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/patients")}
              className="shrink-0 -mt-0.5"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight">
                  {patient.name}
                </h2>
                {patient.age && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    {patient.age} yrs
                  </span>
                )}
                {patient.gender && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    {patient.gender}
                  </span>
                )}
                {patient.diagnosis && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {patient.diagnosis}
                  </span>
                )}
                {bed && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium inline-flex items-center gap-1">
                    <BedDouble className="w-3 h-3" /> {bed.bed_number}
                  </span>
                )}
              </div>
              {/* Key-value line */}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                <span>
                  Admitted{" "}
                  {new Date(patient.admission_date).toLocaleDateString()}
                </span>
                <span>
                  Status:{" "}
                  {patient.discharge_date ? (
                    <span className="text-amber-600 font-medium">
                      Discharged{" "}
                      {new Date(patient.discharge_date).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-medium">Active</span>
                  )}
                </span>
                {patient.notes && (
                  <span className="truncate max-w-xs">{patient.notes}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/recordings?patient=${id}`)}
                className="gap-1.5"
              >
                <Mic className="w-3.5 h-3.5" /> Record Shift Handoff
              </Button>
              {canEdit &&
                (!editing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                    className="gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Button>
                ) : (
                  <>
                    <Button size="sm" onClick={handleSave} className="gap-1.5">
                      <Save className="w-3.5 h-3.5" /> Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
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
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ))}
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon" className="h-8 w-8">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Patient</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {patient.name} and cannot be
                        undone.
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
        </div>

        {/* Edit form panel */}
        {editing && (
          <div className="bg-card border rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold">Edit Patient</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Age</Label>
                <Input
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Gender</Label>
                <Input
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Diagnosis</Label>
                <Input
                  value={form.diagnosis}
                  onChange={(e) =>
                    setForm({ ...form, diagnosis: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Discharge Date</Label>
                <Input
                  type="date"
                  value={form.discharge_date}
                  onChange={(e) =>
                    setForm({ ...form, discharge_date: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Bed Assignment */}
          <div className="lg:col-span-1 bg-card border rounded-lg p-5 h-fit">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <BedDouble className="w-4 h-4 text-muted-foreground" /> Bed
            </h3>
            {bed ? (
              <div className="space-y-2">
                <div>
                  <p className="font-medium text-sm">Bed {bed.bed_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {bed.ward} Ward
                  </p>
                </div>
                {canManageBeds && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => assignBed("none")}
                  >
                    Unassign
                  </Button>
                )}
              </div>
            ) : canManageBeds ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">No bed assigned</p>
                <Select onValueChange={assignBed}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Assign bed..." />
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
              <p className="text-xs text-muted-foreground">No bed assigned</p>
            )}
          </div>

          {/* Tabs area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Underline tabs */}
            <div className="flex gap-6 border-b">
              <button
                onClick={() => setActiveTab("handoffs")}
                className={cn(
                  "pb-2.5 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-colors -mb-px",
                  activeTab === "handoffs"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <ClipboardList className="w-3.5 h-3.5" /> Handoff Reports ({handoffs.length})
              </button>
              <button
                onClick={() => setActiveTab("recordings")}
                className={cn(
                  "pb-2.5 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-colors -mb-px",
                  activeTab === "recordings"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Mic className="w-3.5 h-3.5" /> Recordings ({recordings.length})
              </button>
            </div>

            {/* Handoff Reports Tab */}
            {activeTab === "handoffs" && (
              <div className="space-y-4">
                {handoffs.length === 0 ? (
                  <div className="bg-card border rounded-lg flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <ClipboardList className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm">No handoff reports for this patient</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => navigate(`/recordings?patient=${id}`)}
                      className="mt-1"
                    >
                      Record a shift handoff
                    </Button>
                  </div>
                ) : (
                  handoffs.map((report) => (
                    <HandoffCard key={report.id} report={report} />
                  ))
                )}
              </div>
            )}

            {/* Recordings Tab */}
            {activeTab === "recordings" && (
              <div className="space-y-1">
                {recordings.length === 0 ? (
                  <div className="bg-card border rounded-lg flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Mic className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm">No recordings for this patient</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => navigate("/recordings")}
                      className="mt-1"
                    >
                      Record audio
                    </Button>
                  </div>
                ) : (
                  <div className="bg-card border rounded-lg overflow-hidden divide-y">
                    {recordings.map((rec) => (
                      <div key={rec.id} className="px-4 py-3 space-y-2">
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {new Date(rec.created_at).toLocaleString()}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded",
                                  rec.processed
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700"
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    rec.processed
                                      ? "bg-emerald-500"
                                      : "bg-amber-500"
                                  )}
                                />
                                {rec.processed ? "Processed" : "Processing..."}
                              </span>
                              {rec.duration_seconds != null && (
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
                          <div className="bg-muted/40 rounded-md p-3 ml-7">
                            <p className="text-[11px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                              Transcript
                            </p>
                            <p className="text-sm leading-relaxed">
                              {rec.transcript}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
