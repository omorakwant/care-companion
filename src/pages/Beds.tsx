import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
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
import { Plus, BedDouble } from "lucide-react";
import type { Tables, Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Bed = Tables<"beds">;
type Patient = Tables<"patients">;
type BedStatus = Database["public"]["Enums"]["bed_status"];

export default function Beds() {
  const { role } = useAuth();
  const [beds, setBeds] = useState<
    (Bed & { patients?: { name: string } | null })[]
  >([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [form, setForm] = useState({ bed_number: "", ward: "General" });
  const canManage = role === "admin" || role === "receptionist";

  const fetchBeds = async () => {
    const { data } = await supabase
      .from("beds")
      .select("*, patients(name)")
      .order("bed_number");
    if (data) setBeds(data);
  };

  const fetchPatients = async () => {
    const { data } = await supabase
      .from("patients")
      .select("id, name")
      .is("discharge_date", null)
      .order("name");
    if (data) setPatients(data as Patient[]);
  };

  useEffect(() => {
    fetchBeds();
    fetchPatients();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from("beds")
      .insert({ bed_number: form.bed_number, ward: form.ward });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bed added");
    setDialogOpen(false);
    setForm({ bed_number: "", ward: "General" });
    fetchBeds();
  };

  const updateStatus = async (bed: Bed, status: BedStatus) => {
    if (status === "occupied" && !bed.patient_id) {
      setSelectedBed(bed);
      setSelectedPatientId("");
      setAssignDialogOpen(true);
      return;
    }

    const updates: Record<string, unknown> = { status };
    if (status !== "occupied" && bed.patient_id) {
      updates.patient_id = null;
    }

    const { error } = await supabase
      .from("beds")
      .update(updates)
      .eq("id", bed.id);
    if (error) {
      toast.error("Failed to update bed: " + error.message);
      return;
    }
    toast.success(`Bed ${bed.bed_number} set to ${status}`);
    fetchBeds();
  };

  const handleAssignPatient = async () => {
    if (!selectedBed || !selectedPatientId) return;
    const { error } = await supabase
      .from("beds")
      .update({
        status: "occupied" as BedStatus,
        patient_id: selectedPatientId,
      })
      .eq("id", selectedBed.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Patient assigned to bed");
    setAssignDialogOpen(false);
    setSelectedBed(null);
    setSelectedPatientId("");
    fetchBeds();
  };

  const unassignPatient = async (bed: Bed) => {
    const { error } = await supabase
      .from("beds")
      .update({ patient_id: null, status: "available" as BedStatus })
      .eq("id", bed.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Patient unassigned");
    fetchBeds();
  };

  const assignedPatientIds = beds
    .filter((b) => b.patient_id && b.id !== selectedBed?.id)
    .map((b) => b.patient_id);
  const availablePatients = patients.filter(
    (p) => !assignedPatientIds.includes(p.id)
  );

  // Group beds by ward
  const wardGroups = useMemo(() => {
    const groups: Record<string, typeof beds> = {};
    for (const bed of beds) {
      const ward = bed.ward || "Unassigned";
      if (!groups[ward]) groups[ward] = [];
      groups[ward].push(bed);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [beds]);

  const statusCounts = useMemo(() => {
    const available = beds.filter((b) => b.status === "available").length;
    const occupied = beds.filter((b) => b.status === "occupied").length;
    const maintenance = beds.filter((b) => b.status === "maintenance").length;
    return { available, occupied, maintenance };
  }, [beds]);

  const statusDot: Record<BedStatus, string> = {
    available: "bg-emerald-500",
    occupied: "bg-blue-500",
    maintenance: "bg-amber-500",
  };

  const statusBg: Record<BedStatus, string> = {
    available: "border-emerald-200 bg-emerald-50/50",
    occupied: "border-blue-200 bg-blue-50/50",
    maintenance: "border-amber-200 bg-amber-50/50",
  };

  return (
    <AppLayout title="Bed Management">
      <div className="space-y-5">
        {/* Stats bar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-medium">{statusCounts.available}</span>{" "}
              <span className="text-muted-foreground">Available</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-medium">{statusCounts.occupied}</span>{" "}
              <span className="text-muted-foreground">Occupied</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-medium">{statusCounts.maintenance}</span>{" "}
              <span className="text-muted-foreground">Maintenance</span>
            </span>
          </div>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add Bed
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Bed</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bed Number *</Label>
                    <Input
                      value={form.bed_number}
                      onChange={(e) =>
                        setForm({ ...form, bed_number: e.target.value })
                      }
                      required
                      placeholder="e.g. A-101"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ward</Label>
                    <Input
                      value={form.ward}
                      onChange={(e) =>
                        setForm({ ...form, ward: e.target.value })
                      }
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Add Bed
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {beds.length === 0 ? (
          <div className="bg-card border rounded-lg flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BedDouble className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">No beds configured</p>
          </div>
        ) : (
          wardGroups.map(([ward, wardBeds]) => (
            <div key={ward} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {ward} Ward
              </h3>
              <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                {wardBeds.map((bed) => (
                  <div
                    key={bed.id}
                    className={cn(
                      "border rounded-lg p-3 text-center space-y-1.5 transition-colors",
                      statusBg[bed.status]
                    )}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          statusDot[bed.status]
                        )}
                      />
                      <span className="font-semibold text-sm">
                        {bed.bed_number}
                      </span>
                    </div>
                    {bed.patients?.name ? (
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                          {bed.patients.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-muted-foreground truncate max-w-[70px]">
                          {bed.patients.name}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {bed.status}
                      </p>
                    )}
                    {canManage && (
                      <div className="pt-1 space-y-1">
                        <Select
                          value={bed.status}
                          onValueChange={(v) =>
                            updateStatus(bed, v as BedStatus)
                          }
                        >
                          <SelectTrigger className="h-6 text-[10px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="occupied">Occupied</SelectItem>
                            <SelectItem value="maintenance">
                              Maintenance
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {bed.patient_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-5 text-[10px] text-muted-foreground hover:text-foreground"
                            onClick={() => unassignPatient(bed)}
                          >
                            Unassign
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Patient Assignment Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Assign Patient to Bed {selectedBed?.bed_number}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Select Patient</Label>
                <Select
                  value={selectedPatientId}
                  onValueChange={setSelectedPatientId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a patient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePatients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={handleAssignPatient}
                disabled={!selectedPatientId}
              >
                Assign Patient
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
