import { useEffect, useState } from "react";
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
import { Plus, BedDouble, User } from "lucide-react";
import type { Tables, Database } from "@/integrations/supabase/types";

type Bed = Tables<"beds">;
type Patient = Tables<"patients">;
type BedStatus = Database["public"]["Enums"]["bed_status"];

const statusStyles: Record<BedStatus, string> = {
  available:
    "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30",
  occupied: "bg-primary/15 text-primary border-primary/30",
  maintenance:
    "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30",
};

export default function Beds() {
  const { role } = useAuth();
  const [beds, setBeds] = useState<(Bed & { patients?: { name: string } | null })[]>([]);
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
      // Open patient assignment dialog
      setSelectedBed(bed);
      setSelectedPatientId("");
      setAssignDialogOpen(true);
      return;
    }

    const updates: Record<string, unknown> = { status };
    // If moving away from occupied, unassign patient
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

  // Get patients who are not already assigned to another bed
  const assignedPatientIds = beds
    .filter((b) => b.patient_id && b.id !== selectedBed?.id)
    .map((b) => b.patient_id);
  const availablePatients = patients.filter(
    (p) => !assignedPatientIds.includes(p.id)
  );

  return (
    <AppLayout title="Bed Management">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {beds.filter((b) => b.status === "available").length} of{" "}
            {beds.length} beds available
          </p>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" /> Add Bed
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Bed</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Bed Number *</Label>
                    <Input
                      value={form.bed_number}
                      onChange={(e) =>
                        setForm({ ...form, bed_number: e.target.value })
                      }
                      required
                      placeholder="e.g. A-101"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ward</Label>
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
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BedDouble className="w-10 h-10 mb-2" />
              <p>No beds configured</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {beds.map((bed) => (
              <Card key={bed.id} className="text-center">
                <CardContent className="p-4 space-y-2">
                  <p className="font-semibold text-sm">{bed.bed_number}</p>
                  <p className="text-xs text-muted-foreground">{bed.ward}</p>
                  <Badge
                    variant="outline"
                    className={statusStyles[bed.status]}
                  >
                    {bed.status}
                  </Badge>
                  {bed.patients?.name && (
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span className="truncate">{bed.patients.name}</span>
                    </div>
                  )}
                  {canManage && (
                    <div className="space-y-1.5">
                      <Select
                        value={bed.status}
                        onValueChange={(v) =>
                          updateStatus(bed, v as BedStatus)
                        }
                      >
                        <SelectTrigger className="h-7 text-xs mt-2">
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
                          className="w-full h-6 text-xs text-muted-foreground"
                          onClick={() => unassignPatient(bed)}
                        >
                          Unassign Patient
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
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
              <div className="space-y-2">
                <Label>Select Patient</Label>
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
