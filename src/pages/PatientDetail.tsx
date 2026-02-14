import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { Label } from "@/components/ui/label";
import { HandoffCard } from "@/components/HandoffCard";
import { WoundCard } from "@/components/patient/WoundCard";
import { ChartChat } from "@/components/chat/ChartChat";
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
  Camera,
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
  const { role, user } = useAuth();
  const { t } = useTranslation();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [handoffs, setHandoffs] = useState<HandoffReport[]>([]);
  const [recordings, setRecordings] = useState<AudioNotice[]>([]);
  const [wounds, setWounds] = useState<any[]>([]);
  const [analyzingWound, setAnalyzingWound] = useState<string | null>(null);
  const [bed, setBed] = useState<Bed | null>(null);
  const [allBeds, setAllBeds] = useState<Bed[]>([]);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"handoffs" | "recordings" | "wounds">(
    "handoffs"
  );
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
      toast.error(t("patientDetail.patientNotFound"));
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
    const [handoffsRes, recordingsRes, bedRes, allBedsRes] =
      await Promise.all([
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

  const fetchWounds = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from("wound_entries")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });
      if (!error && data) setWounds(data);
    } catch {
      // wound_entries table may not exist yet — silently ignore
    }
  };

  useEffect(() => {
    fetchPatient();
    fetchRelated();
    fetchWounds();
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
    toast.success(t("patientDetail.patientUpdated"));
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
    toast.success(t("patientDetail.patientDeleted"));
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
      toast.success(t("patientDetail.bedUnassigned"));
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
    toast.success(t("patientDetail.bedAssigned"));
    fetchRelated();
  };

  const handleAnalyzeWound = async (woundId: string) => {
    setAnalyzingWound(woundId);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-wound`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ wound_entry_id: woundId }),
        }
      );
      if (res.ok) {
        toast.success(t("wound.analysisComplete"));
        fetchWounds();
      }
    } catch {
      toast.error(t("wound.analysisFailed"));
    }
    setAnalyzingWound(null);
  };

  const handleWoundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || !user) return;
    try {
      const fileName = `wounds/${id}/${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("audio-recordings")
        .upload(fileName, file, { contentType: file.type });
      if (uploadError) { toast.error(uploadError.message); return; }
      const { data: urlData } = supabase.storage.from("audio-recordings").getPublicUrl(fileName);
      const { error: insertError } = await supabase.from("wound_entries").insert({
        patient_id: id,
        image_url: urlData.publicUrl,
        created_by: user.id,
      });
      if (insertError) {
        toast.error(insertError.message);
        return;
      }
      toast.success(t("wound.uploaded"));
      fetchWounds();
    } catch (err) {
      toast.error((err as Error).message || "Upload failed");
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!patient) return null;

  const initials = patient.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-8 lg:px-10 h-full overflow-auto">
        {/* Back row */}
        <button
          onClick={() => navigate("/patients")}
          className="flex items-center gap-2 text-[12px] text-[var(--c-text-muted)] hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> {t('patientDetail.backToPatients')}
        </button>

        {/* Patient Header Card */}
        <div className="glass-card rounded-2xl p-6 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-lg font-bold text-white shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl font-semibold text-foreground">
              {patient.name}
            </h2>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              {patient.age && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--c-surface-alt)] text-[var(--c-text-secondary)]">
                  {patient.age} {t('patientDetail.yrs')}
                </span>
              )}
              {patient.gender && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--c-surface-alt)] text-[var(--c-text-secondary)]">
                  {patient.gender}
                </span>
              )}
              {patient.diagnosis && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-[var(--c-primary)]">
                  {patient.diagnosis}
                </span>
              )}
              {bed && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-info/10 text-[var(--c-info)] flex items-center gap-1">
                  <BedDouble className="w-3 h-3" /> {bed.bed_number}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => navigate(`/recordings?patient=${id}`)}
              className="flex items-center gap-1.5 gradient-primary rounded-[10px] h-9 px-3.5 text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
            >
              <Mic className="w-3.5 h-3.5" /> {t('patientDetail.recordHandoff')}
            </button>
            {canEdit && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 bg-[var(--c-surface-alt)] border border-[var(--c-border)] rounded-[10px] h-9 px-3.5 text-[var(--c-text-secondary)] text-[12px] hover:text-foreground transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> {t('patientDetail.edit')}
              </button>
            )}
            {canDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="w-9 h-9 rounded-[10px] bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/15 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[var(--c-surface)] border-[var(--c-border)]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-display text-foreground">
                      {t('patientDetail.deletePatient')}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[var(--c-text-muted)]">
                      {t('patientDetail.deleteConfirm', { name: patient.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-[var(--c-surface-alt)] border-[var(--c-border)] text-foreground hover:bg-[var(--c-border)]">
                      {t('patientDetail.cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {t('patientDetail.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-foreground">
                {t('patientDetail.editPatient')}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 gradient-primary rounded-[10px] h-8 px-3 text-white text-[12px] font-medium"
                >
                  <Save className="w-3.5 h-3.5" /> {t('patientDetail.save')}
                </button>
                <button
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
                  className="w-8 h-8 rounded-[10px] bg-[var(--c-surface-alt)] flex items-center justify-center text-[var(--c-text-muted)] hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: t('patients.name'), key: "name", type: "text" },
                { label: t('patients.age'), key: "age", type: "number" },
                { label: t('patients.gender'), key: "gender", type: "text" },
                { label: t('patients.diagnosis'), key: "diagnosis", type: "text" },
                {
                  label: t('patientDetail.dischargeDate'),
                  key: "discharge_date",
                  type: "date",
                },
              ].map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-xs text-[var(--c-text-secondary)]">
                    {field.label}
                  </Label>
                  <input
                    type={field.type}
                    value={(form as any)[field.key]}
                    onChange={(e) =>
                      setForm({ ...form, [field.key]: e.target.value })
                    }
                    className="w-full h-[42px] px-4 rounded-[10px] bg-[var(--c-surface-alt)] border border-[var(--c-border)] text-foreground text-[13px] focus:outline-none focus:border-primary"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[var(--c-text-secondary)]">{t('patients.notes')}</Label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 rounded-[10px] bg-[var(--c-surface-alt)] border border-[var(--c-border)] text-foreground text-[13px] focus:outline-none focus:border-primary resize-none"
              />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-6 border-b border-[var(--c-border)]">
          <button
            onClick={() => setActiveTab("handoffs")}
            className={cn(
              "pb-2.5 text-[12px] font-semibold flex items-center gap-1.5 border-b-2 transition-colors -mb-px",
              activeTab === "handoffs"
                ? "border-[var(--c-primary)] text-foreground"
                : "border-transparent text-[var(--c-text-muted)] hover:text-foreground"
            )}
          >
            <ClipboardList className="w-3.5 h-3.5" /> {t('patientDetail.handoffReports')} (
            {handoffs.length})
          </button>
          <button
            onClick={() => setActiveTab("recordings")}
            className={cn(
              "pb-2.5 text-[12px] font-semibold flex items-center gap-1.5 border-b-2 transition-colors -mb-px",
              activeTab === "recordings"
                ? "border-[var(--c-primary)] text-foreground"
                : "border-transparent text-[var(--c-text-muted)] hover:text-foreground"
            )}
          >
            <Mic className="w-3.5 h-3.5" /> {t('patientDetail.recordingsTab')} ({recordings.length})
          </button>
          <button
            onClick={() => setActiveTab("wounds")}
            className={cn(
              "pb-2.5 text-[12px] font-semibold flex items-center gap-1.5 border-b-2 transition-colors -mb-px",
              activeTab === "wounds"
                ? "border-[var(--c-primary)] text-foreground"
                : "border-transparent text-[var(--c-text-muted)] hover:text-foreground"
            )}
          >
            <Camera className="w-3.5 h-3.5" /> {t("wound.title")} ({wounds.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "handoffs" && (
          <div className="space-y-4">
            {handoffs.length === 0 ? (
              <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-12 text-[var(--c-text-muted)]">
                <ClipboardList className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-[13px]">
                  {t('patientDetail.noHandoffs')}
                </p>
                <button
                  onClick={() => navigate(`/recordings?patient=${id}`)}
                  className="text-[12px] text-[var(--c-primary)] hover:underline mt-1"
                >
                  {t('patientDetail.recordAHandoff')}
                </button>
              </div>
            ) : (
              handoffs.map((report) => (
                <HandoffCard key={report.id} report={report} />
              ))
            )}
          </div>
        )}

        {activeTab === "recordings" && (
          <div className="space-y-1">
            {recordings.length === 0 ? (
              <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-12 text-[var(--c-text-muted)]">
                <Mic className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-[13px]">{t('patientDetail.noRecordings')}</p>
                <button
                  onClick={() => navigate("/recordings")}
                  className="text-[12px] text-[var(--c-primary)] hover:underline mt-1"
                >
                  {t('patientDetail.recordAudio')}
                </button>
              </div>
            ) : (
              <div className="glass-card rounded-2xl overflow-hidden divide-y divide-[var(--c-border)]">
                {recordings.map((rec) => (
                  <div key={rec.id} className="px-5 py-3.5 space-y-2">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-[var(--c-text-muted)] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground">
                          {new Date(rec.created_at).toLocaleString()}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={cn(
                              "text-[10px] font-medium px-2 py-0.5 rounded-full",
                              rec.processed
                                ? "bg-accent/10 text-[var(--c-accent)]"
                                : "bg-warning/10 text-[var(--c-warning)]"
                            )}
                          >
                            {rec.processed ? t('recordings.processed') : t('recordings.processing')}
                          </span>
                          {rec.duration_seconds != null && (
                            <span className="text-[11px] text-[var(--c-text-muted)] font-mono">
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
                      <div className="bg-[var(--c-surface-alt)] rounded-[10px] p-3 ml-7">
                        <p className="text-[10px] font-medium text-[var(--c-text-muted)] mb-1 uppercase tracking-wider">
                          {t('recordings.transcript')}
                        </p>
                        <p className="text-[13px] text-[var(--c-text-secondary)] leading-relaxed">
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

        {activeTab === "wounds" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <label className="flex items-center gap-2 gradient-primary rounded-[10px] h-9 px-4 text-white text-[12px] font-medium hover:opacity-90 cursor-pointer transition-opacity">
                <Camera className="w-3.5 h-3.5" /> {t("wound.uploadImage")}
                <input type="file" accept="image/*" onChange={handleWoundUpload} className="hidden" />
              </label>
            </div>
            {wounds.length === 0 ? (
              <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-12 text-[var(--c-text-muted)]">
                <Camera className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-[13px]">{t("wound.noWounds")}</p>
              </div>
            ) : (
              wounds.map((w) => (
                <WoundCard
                  key={w.id}
                  entry={w}
                  onAnalyze={handleAnalyzeWound}
                  analyzing={analyzingWound === w.id}
                />
              ))
            )}
          </div>
        )}
      </div>

      {patient && <ChartChat patientId={patient.id} patientName={patient.name} />}
    </AppLayout>
  );
}
