import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Search, BedDouble } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Patient = Tables<"patients">;
type FilterStatus = "all" | "active" | "discharged";

export default function Patients() {
  const { t } = useTranslation();
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
  const [bedMap, setBedMap] = useState<Record<string, string>>({});

  const filterOptions: { value: FilterStatus; label: string }[] = [
    { value: "all", label: t('patients.all') },
    { value: "active", label: t('patients.active') },
    { value: "discharged", label: t('patients.discharged') },
  ];

  const fetchPatients = async () => {
    const { data } = await supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPatients(data);
  };

  const fetchRelatedData = async () => {
    const bedsRes = await supabase
      .from("beds")
      .select("bed_number, patient_id")
      .not("patient_id", "is", null);
    if (bedsRes.data) {
      const map: Record<string, string> = {};
      bedsRes.data.forEach((b) => {
        if (b.patient_id) map[b.patient_id] = b.bed_number;
      });
      setBedMap(map);
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
    toast.success(t('patients.patientAdded'));
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
    <AppLayout>
      <div className="flex flex-col gap-6 p-8 lg:px-10 h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-[28px] font-semibold text-foreground">
              {t('patients.title')}
            </h2>
            <p className="text-xs text-[var(--c-text-muted)]">
              {t('patients.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[var(--c-surface-alt)] rounded-[10px] h-[38px] px-3.5 w-[220px]">
              <Search className="w-3.5 h-3.5 text-[var(--c-text-dim)]" />
              <input
                placeholder={t('patients.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-[12px] text-foreground placeholder:text-[var(--c-text-dim)] focus:outline-none w-full"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-2 gradient-primary rounded-[10px] h-[38px] px-4 text-white text-[12px] font-medium hover:opacity-90 transition-opacity">
                  <Plus className="w-3.5 h-3.5" /> {t('patients.addPatient')}
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[var(--c-surface)] border-[var(--c-border)]">
                <DialogHeader>
                  <DialogTitle className="font-display text-lg text-foreground">
                    {t('patients.addNewPatient')}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-[var(--c-text-secondary)]">{t('patients.name')} *</Label>
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      required
                      className="w-full h-[42px] px-4 rounded-[10px] bg-[var(--c-surface-alt)] border border-[var(--c-border)] text-foreground text-[13px] placeholder:text-[var(--c-text-dim)] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-[var(--c-text-secondary)]">{t('patients.age')}</Label>
                      <input
                        type="number"
                        value={form.age}
                        onChange={(e) =>
                          setForm({ ...form, age: e.target.value })
                        }
                        className="w-full h-[42px] px-4 rounded-[10px] bg-[var(--c-surface-alt)] border border-[var(--c-border)] text-foreground text-[13px] placeholder:text-[var(--c-text-dim)] focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-[var(--c-text-secondary)]">{t('patients.gender')}</Label>
                      <input
                        value={form.gender}
                        onChange={(e) =>
                          setForm({ ...form, gender: e.target.value })
                        }
                        placeholder={t('patients.genderPlaceholder')}
                        className="w-full h-[42px] px-4 rounded-[10px] bg-[var(--c-surface-alt)] border border-[var(--c-border)] text-foreground text-[13px] placeholder:text-[var(--c-text-dim)] focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[var(--c-text-secondary)]">{t('patients.diagnosis')}</Label>
                    <input
                      value={form.diagnosis}
                      onChange={(e) =>
                        setForm({ ...form, diagnosis: e.target.value })
                      }
                      className="w-full h-[42px] px-4 rounded-[10px] bg-[var(--c-surface-alt)] border border-[var(--c-border)] text-foreground text-[13px] placeholder:text-[var(--c-text-dim)] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-[var(--c-text-secondary)]">{t('patients.notes')}</Label>
                    <input
                      value={form.notes}
                      onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                      }
                      className="w-full h-[42px] px-4 rounded-[10px] bg-[var(--c-surface-alt)] border border-[var(--c-border)] text-foreground text-[13px] placeholder:text-[var(--c-text-dim)] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full h-[42px] rounded-[10px] gradient-primary text-white text-[13px] font-semibold hover:opacity-90"
                  >
                    {t('patients.addPatient')}
                  </button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={cn(
                "h-8 px-3.5 rounded-lg text-[11px] font-semibold transition-colors",
                filterStatus === opt.value
                  ? "bg-primary/10 text-[var(--c-primary)] border border-primary/25"
                  : "bg-[var(--c-surface-alt)] text-[var(--c-text-secondary)] border border-transparent hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="glass-card rounded-2xl flex-1 overflow-hidden flex flex-col">
          {/* Table Header */}
          <div className="flex items-center h-11 px-5 border-b border-[var(--c-border)]">
            <span className="flex-1 text-[10px] font-medium tracking-[1px] text-[var(--c-text-dim)] uppercase">
              {t('patients.name')}
            </span>
            <span className="w-20 text-[10px] font-medium tracking-[1px] text-[var(--c-text-dim)] uppercase">
              {t('patients.age')}
            </span>
            <span className="w-[100px] text-[10px] font-medium tracking-[1px] text-[var(--c-text-dim)] uppercase">
              {t('patients.gender')}
            </span>
            <span className="flex-1 text-[10px] font-medium tracking-[1px] text-[var(--c-text-dim)] uppercase">
              {t('patients.diagnosis')}
            </span>
            <span className="w-20 text-[10px] font-medium tracking-[1px] text-[var(--c-text-dim)] uppercase">
              {t('patients.bed')}
            </span>
            <span className="w-[100px] text-[10px] font-medium tracking-[1px] text-[var(--c-text-dim)] uppercase">
              {t('patients.status')}
            </span>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-auto">
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-[13px] text-[var(--c-text-muted)]">
                {t('patients.noPatients')}
              </div>
            ) : (
              filtered.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/patients/${p.id}`)}
                  className="flex items-center h-[52px] px-5 border-b border-[var(--c-border)] hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <div className="flex-1 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--c-primary)] to-[var(--c-info)] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[13px] font-medium text-foreground truncate">
                      {p.name}
                    </span>
                  </div>
                  <span className="w-20 text-[13px] text-[var(--c-text-secondary)]">
                    {p.age ?? "—"}
                  </span>
                  <span className="w-[100px] text-[13px] text-[var(--c-text-secondary)]">
                    {p.gender || "—"}
                  </span>
                  <span className="flex-1 text-[13px] text-[var(--c-text-secondary)] truncate">
                    {p.diagnosis || "—"}
                  </span>
                  <span className="w-20 text-[13px] text-[var(--c-text-secondary)]">
                    {bedMap[p.id] ? (
                      <span className="flex items-center gap-1">
                        <BedDouble className="w-3 h-3" /> {bedMap[p.id]}
                      </span>
                    ) : (
                      "—"
                    )}
                  </span>
                  <span className="w-[100px]">
                    <span
                      className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full",
                        p.discharge_date
                          ? "bg-muted text-[var(--c-text-muted)]"
                          : "bg-accent/10 text-[var(--c-accent)]"
                      )}
                    >
                      {p.discharge_date ? t('patients.discharged') : t('patients.active')}
                    </span>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
