import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { Label } from "@/components/ui/label";
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

const statusBorder: Record<BedStatus, string> = {
  available: "border-accent/15",
  occupied: "border-primary/15",
  maintenance: "border-warning/15",
};

export default function Beds() {
  const { role, department } = useAuth();
  const { t } = useTranslation();
  const [beds, setBeds] = useState<
    (Bed & { patients?: { name: string } | null })[]
  >([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [form, setForm] = useState({ bed_number: "", ward: "A" });
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
    toast.success(t('beds.bedAdded'));
    setDialogOpen(false);
    setForm({ bed_number: "", ward: "A" });
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
      toast.error(t('beds.updateFailed', { message: error.message }));
      return;
    }
    toast.success(t('beds.statusUpdated', { bed: bed.bed_number, status }));
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
    toast.success(t('beds.patientAssigned'));
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
    toast.success(t('beds.patientUnassigned'));
    fetchBeds();
  };

  const assignedPatientIds = beds
    .filter((b) => b.patient_id && b.id !== selectedBed?.id)
    .map((b) => b.patient_id);
  const availablePatients = patients.filter(
    (p) => !assignedPatientIds.includes(p.id)
  );

  // Filter beds by department for non-admin users
  const filteredBeds = useMemo(() => {
    if (role === "admin" || !department) return beds;
    return beds.filter((b) => b.ward === department);
  }, [beds, role, department]);

  const wardGroups = useMemo(() => {
    const groups: Record<string, typeof filteredBeds> = {};
    for (const bed of filteredBeds) {
      const ward = bed.ward || "Unassigned";
      if (!groups[ward]) groups[ward] = [];
      groups[ward].push(bed);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredBeds]);

  const statusCounts = useMemo(() => {
    const available = filteredBeds.filter((b) => b.status === "available").length;
    const occupied = filteredBeds.filter((b) => b.status === "occupied").length;
    const maintenance = filteredBeds.filter((b) => b.status === "maintenance").length;
    return { available, occupied, maintenance, total: filteredBeds.length };
  }, [filteredBeds]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-8 lg:px-10 h-full overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-[28px] font-semibold text-foreground">
              {t('beds.title')}
            </h2>
            <p className="text-xs text-[var(--c-text-muted)]">
              {t('beds.subtitle')}
            </p>
          </div>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 gradient-primary rounded-[10px] h-[38px] px-4 text-white text-[12px] font-medium hover:opacity-90 transition-opacity">
                  <Plus className="w-3.5 h-3.5" /> {t('beds.addBed')}
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[var(--c-surface)] border-[var(--c-border)]">
                <DialogHeader>
                  <DialogTitle className="font-display text-lg text-foreground">
                    {t('beds.addNewBed')}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[var(--c-text-secondary)]">
                      {t('beds.bedNumber')} *
                    </Label>
                    <input
                      value={form.bed_number}
                      onChange={(e) =>
                        setForm({ ...form, bed_number: e.target.value })
                      }
                      required
                      placeholder={t('beds.bedNumberPlaceholder')}
                      className="w-full h-[42px] px-4 rounded-[10px] bg-[var(--c-surface-alt)] border border-[var(--c-border)] text-foreground text-[13px] placeholder:text-[var(--c-text-dim)] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[var(--c-text-secondary)]">{t('beds.ward')}</Label>
                    <input
                      value={form.ward}
                      onChange={(e) =>
                        setForm({ ...form, ward: e.target.value })
                      }
                      className="w-full h-[42px] px-4 rounded-[10px] bg-[var(--c-surface-alt)] border border-[var(--c-border)] text-foreground text-[13px] placeholder:text-[var(--c-text-dim)] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full h-[42px] rounded-[10px] gradient-primary text-white text-[13px] font-semibold hover:opacity-90"
                  >
                    {t('beds.addBed')}
                  </button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="glass-card rounded-xl p-4 flex flex-col gap-1.5">
            <span className="font-display text-[28px] font-bold text-[var(--c-accent)]">
              {statusCounts.available}
            </span>
            <span className="text-[10px] tracking-[1px] text-[var(--c-text-muted)] uppercase">
              {t('beds.available')}
            </span>
          </div>
          <div className="glass-card rounded-xl p-4 flex flex-col gap-1.5">
            <span className="font-display text-[28px] font-bold text-[var(--c-primary)]">
              {statusCounts.occupied}
            </span>
            <span className="text-[10px] tracking-[1px] text-[var(--c-text-muted)] uppercase">
              {t('beds.occupied')}
            </span>
          </div>
          <div className="glass-card rounded-xl p-4 flex flex-col gap-1.5">
            <span className="font-display text-[28px] font-bold text-[var(--c-warning)]">
              {statusCounts.maintenance}
            </span>
            <span className="text-[10px] tracking-[1px] text-[var(--c-text-muted)] uppercase">
              {t('beds.maintenance')}
            </span>
          </div>
          <div className="glass-card rounded-xl p-4 flex flex-col gap-1.5">
            <span className="font-display text-[28px] font-bold text-foreground">
              {statusCounts.total}
            </span>
            <span className="text-[10px] tracking-[1px] text-[var(--c-text-muted)] uppercase">
              {t('beds.total')}
            </span>
          </div>
        </div>

        {/* Ward grids */}
        {filteredBeds.length === 0 ? (
          <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-16 text-[var(--c-text-muted)]">
            <BedDouble className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-[13px]">{t('beds.noBeds')}</p>
          </div>
        ) : (
          wardGroups.map(([ward, wardBeds]) => (
            <div key={ward} className="flex flex-col gap-3">
              <h3 className="font-display text-base font-semibold text-foreground uppercase">
                {t('beds.ward')} {ward}
              </h3>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {wardBeds.map((bed) => (
                  <div
                    key={bed.id}
                    className={cn(
                      "bg-[var(--c-surface)] rounded-xl p-4 flex flex-col gap-2.5 border",
                      statusBorder[bed.status]
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-foreground">
                        {bed.bed_number}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                          bed.status === "available" &&
                            "bg-accent/10 text-[var(--c-accent)]",
                          bed.status === "occupied" &&
                            "bg-primary/10 text-[var(--c-primary)]",
                          bed.status === "maintenance" &&
                            "bg-warning/10 text-[var(--c-warning)]"
                        )}
                      >
                        {bed.status}
                      </span>
                    </div>
                    {bed.patients?.name ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                          {bed.patients.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[11px] text-[var(--c-text-secondary)] truncate">
                          {bed.patients.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[var(--c-text-dim)]">
                        {bed.status === "maintenance"
                          ? t('beds.underMaintenance')
                          : t('beds.empty')}
                      </span>
                    )}
                    {canManage && (
                      <div className="flex gap-1.5 mt-1">
                        <Select
                          value={bed.status}
                          onValueChange={(v) =>
                            updateStatus(bed, v as BedStatus)
                          }
                        >
                          <SelectTrigger className="h-7 text-[10px] bg-[var(--c-surface-alt)] border-[var(--c-border)] text-[var(--c-text-secondary)]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[var(--c-surface)] border-[var(--c-border)]">
                            <SelectItem value="available">{t('beds.available')}</SelectItem>
                            <SelectItem value="occupied">{t('beds.occupied')}</SelectItem>
                            <SelectItem value="maintenance">
                              {t('beds.maintenance')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {bed.patient_id && (
                          <button
                            onClick={() => unassignPatient(bed)}
                            className="h-7 px-2 text-[10px] text-[var(--c-text-muted)] hover:text-foreground rounded bg-[var(--c-surface-alt)] border border-[var(--c-border)] transition-colors"
                          >
                            {t('beds.unassign')}
                          </button>
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
          <DialogContent className="bg-[var(--c-surface)] border-[var(--c-border)]">
            <DialogHeader>
              <DialogTitle className="font-display text-lg text-foreground">
                {t('beds.assignPatient', { bed: selectedBed?.bed_number })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-[var(--c-text-secondary)]">
                  {t('beds.selectPatient')}
                </Label>
                <Select
                  value={selectedPatientId}
                  onValueChange={setSelectedPatientId}
                >
                  <SelectTrigger className="bg-[var(--c-surface-alt)] border-[var(--c-border)] text-foreground">
                    <SelectValue placeholder={t('beds.choosePationt')} />
                  </SelectTrigger>
                  <SelectContent className="bg-[var(--c-surface)] border-[var(--c-border)]">
                    {availablePatients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button
                className="w-full h-[42px] rounded-[10px] gradient-primary text-white text-[13px] font-semibold hover:opacity-90 disabled:opacity-50"
                onClick={handleAssignPatient}
                disabled={!selectedPatientId}
              >
                {t('beds.assignBtn')}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
