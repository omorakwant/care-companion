import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { DataTable, type Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Search, User, BedDouble, ListTodo } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Patient = Tables<"patients">;

type FilterStatus = "all" | "active" | "discharged";

const filterOptions: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "discharged", label: "Discharged" },
];

export default function Patients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
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

  const columns: Column<Patient>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{row.name}</span>
          {taskCountMap[row.id] ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ListTodo className="w-3 h-3" />
              {taskCountMap[row.id]}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "age",
      header: "Age",
      className: "w-[80px]",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.age ?? "—"}
        </span>
      ),
    },
    {
      key: "gender",
      header: "Gender",
      className: "w-[90px]",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.gender || "—"}
        </span>
      ),
    },
    {
      key: "diagnosis",
      header: "Diagnosis",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.diagnosis || "—"}
        </span>
      ),
    },
    {
      key: "bed",
      header: "Bed",
      className: "w-[100px]",
      render: (row) =>
        bedMap[row.id] ? (
          <span className="inline-flex items-center gap-1.5 text-sm">
            <BedDouble className="w-3.5 h-3.5 text-muted-foreground" />
            {bedMap[row.id]}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-[120px]",
      render: (row) => (
        <StatusBadge
          type="patient"
          value={row.discharge_date ? "discharged" : "active"}
        />
      ),
    },
    {
      key: "admitted",
      header: "Admitted",
      className: "w-[120px]",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.admission_date).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <AppLayout title="Patients">
      <div className="space-y-4">
        {/* Toolbar */}
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

          {/* Filter pills */}
          <div className="flex items-center gap-1">
            {filterOptions.map((opt) => (
              <Button
                key={opt.value}
                size="sm"
                variant={filterStatus === opt.value ? "default" : "outline"}
                onClick={() => setFilterStatus(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          <div className="ml-auto">
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
        </div>

        {/* Data table */}
        <DataTable<Patient>
          columns={columns}
          data={filtered}
          onRowClick={(row) => navigate(`/patients/${row.id}`)}
          emptyIcon={<User className="w-10 h-10" />}
          emptyMessage="No patients found"
        />
      </div>
    </AppLayout>
  );
}
