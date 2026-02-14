import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Search, User, BedDouble, ListTodo } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Patient = Tables<"patients">;

export default function Patients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "",
    diagnosis: "",
    notes: "",
  });

  // Track bed/task counts per patient
  const [bedMap, setBedMap] = useState<Record<string, string>>({});
  const [taskCountMap, setTaskCountMap] = useState<Record<string, number>>({});

  const fetchPatients = async () => {
    const { data } = await supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPatients(data);
  };

  const fetchRelatedData = async () => {
    const [bedsRes, tasksRes] = await Promise.all([
      supabase
        .from("beds")
        .select("bed_number, patient_id")
        .not("patient_id", "is", null),
      supabase
        .from("tasks")
        .select("patient_id")
        .eq("status", "pending")
        .not("patient_id", "is", null),
    ]);

    if (bedsRes.data) {
      const map: Record<string, string> = {};
      bedsRes.data.forEach((b) => {
        if (b.patient_id) map[b.patient_id] = b.bed_number;
      });
      setBedMap(map);
    }

    if (tasksRes.data) {
      const map: Record<string, number> = {};
      tasksRes.data.forEach((t) => {
        if (t.patient_id) map[t.patient_id] = (map[t.patient_id] || 0) + 1;
      });
      setTaskCountMap(map);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchRelatedData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("patients").insert({
      name: form.name,
      age: form.age ? parseInt(form.age) : null,
      gender: form.gender || null,
      diagnosis: form.diagnosis || null,
      notes: form.notes || null,
      created_by: user.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Patient added");
    setDialogOpen(false);
    setForm({ name: "", age: "", gender: "", diagnosis: "", notes: "" });
    fetchPatients();
    fetchRelatedData();
  };

  const filtered = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.diagnosis?.toLowerCase().includes(search.toLowerCase()) ?? false);
    if (!matchesSearch) return false;
    if (filterStatus === "active") return !p.discharge_date;
    if (filterStatus === "discharged") return !!p.discharge_date;
    return true;
  });

  return (
    <AppLayout title="Patients">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
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
              <SelectItem value="all">All Patients</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="discharged">Discharged</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Add Patient
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Patient</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                      placeholder="M / F / Other"
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
                  <Input
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                  />
                </div>
                <Button type="submit" className="w-full">
                  Add Patient
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <User className="w-10 h-10 mb-2" />
              <p>No patients found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((patient) => (
              <Card
                key={patient.id}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => navigate(`/patients/${patient.id}`)}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {patient.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {patient.age ? `${patient.age} yrs` : ""}{" "}
                        {patient.gender ? `· ${patient.gender}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {patient.diagnosis && (
                        <Badge variant="secondary" className="text-xs">
                          {patient.diagnosis}
                        </Badge>
                      )}
                      {patient.discharge_date && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-muted text-muted-foreground"
                        >
                          Discharged
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      Admitted:{" "}
                      {new Date(patient.admission_date).toLocaleDateString()}
                    </span>
                    {bedMap[patient.id] && (
                      <span className="flex items-center gap-1">
                        <BedDouble className="w-3 h-3" />
                        {bedMap[patient.id]}
                      </span>
                    )}
                    {taskCountMap[patient.id] && (
                      <span className="flex items-center gap-1">
                        <ListTodo className="w-3 h-3" />
                        {taskCountMap[patient.id]} pending
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
