import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { HandoffCard } from "@/components/HandoffCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Mic,
  MicOff,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  FileText,
  ChevronDown,
  ChevronRight,
  Languages,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Patient = Tables<"patients">;
type AudioNotice = Tables<"audio_notices"> & {
  patients?: { name: string } | null;
};
type HandoffReport = Tables<"handoff_reports">;

export default function Recordings() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const preselectedPatient = searchParams.get("patient") ?? "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [recordings, setRecordings] = useState<AudioNotice[]>([]);
  const [reportsByRecording, setReportsByRecording] = useState<
    Record<string, HandoffReport[]>
  >({});
  const [selectedPatient, setSelectedPatient] =
    useState<string>(preselectedPatient);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [expandedRec, setExpandedRec] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    supabase
      .from("patients")
      .select("id, name")
      .is("discharge_date", null)
      .order("name")
      .then(({ data }) => {
        if (data) setPatients(data as Patient[]);
      });
    fetchRecordings();

    const audioChannel = supabase
      .channel("audio-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "audio_notices" },
        (payload) => {
          const updated = payload.new as AudioNotice;
          if (updated.processed) {
            fetchRecordings();
            toast.success(t('recordings.aiProcessingComplete'));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "handoff_reports" },
        () => {
          fetchRecordings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(audioChannel);
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  const fetchRecordings = async () => {
    const { data } = await supabase
      .from("audio_notices")
      .select("*, patients(name)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      setRecordings(data as AudioNotice[]);
      const ids = data.map((r) => r.id);
      if (ids.length > 0) {
        const { data: reports } = await supabase
          .from("handoff_reports")
          .select("*")
          .in("audio_notice_id", ids);
        if (reports) {
          const grouped: Record<string, HandoffReport[]> = {};
          reports.forEach((r) => {
            if (r.audio_notice_id) {
              if (!grouped[r.audio_notice_id])
                grouped[r.audio_notice_id] = [];
              grouped[r.audio_notice_id].push(r);
            }
          });
          setReportsByRecording(grouped);
        }
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setRecordingTime(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      toast.error(t('recordings.microphoneError'));
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const discardRecording = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const uploadRecording = async () => {
    if (!audioBlob || !selectedPatient || !user) return;
    setUploading(true);

    const fileName = `${user.id}/${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage
      .from("audio-recordings")
      .upload(fileName, audioBlob, { contentType: "audio/webm" });

    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: insertData, error: insertError } = await supabase
      .from("audio_notices")
      .insert({
        patient_id: selectedPatient,
        recorded_by: user.id,
        storage_path: fileName,
        duration_seconds: recordingTime,
      })
      .select()
      .single();

    if (insertError) {
      toast.error(insertError.message);
      setUploading(false);
      return;
    }

    toast.success(t('recordings.uploaded'));
    discardRecording();
    setUploading(false);

    if (insertData) {
      setProcessing(insertData.id);
      setExpandedRec(insertData.id);
    }
    fetchRecordings();

    if (insertData) {
      pollForCompletion(insertData.id);
    }
  };

  const pollForCompletion = async (audioNoticeId: string) => {
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const { data } = await supabase
        .from("audio_notices")
        .select("processed")
        .eq("id", audioNoticeId)
        .single();
      if (data?.processed) {
        setProcessing(null);
        fetchRecordings();
        return;
      }
    }
    setProcessing(null);
    fetchRecordings();
  };

  const retryProcessing = async (audioNoticeId: string) => {
    setProcessing(audioNoticeId);
    setExpandedRec(audioNoticeId);
    toast.info(t('recordings.retrying'));

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-audio`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ audio_notice_id: audioNoticeId }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(
          `Processing failed (${res.status}): ${errData?.error || "Unknown error"}`
        );
      } else {
        toast.success(t('recordings.processingComplete'));
      }
    } catch (err) {
      toast.error(`Retry failed: ${(err as Error).message}`);
    }

    setProcessing(null);
    fetchRecordings();
  };

  const playAudio = async (storagePath: string, recordingId: string) => {
    if (playingId === recordingId) {
      audioPlayerRef.current?.pause();
      setPlayingId(null);
      return;
    }
    const { data } = await supabase.storage
      .from("audio-recordings")
      .createSignedUrl(storagePath, 300);
    if (data?.signedUrl) {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      const audio = new Audio(data.signedUrl);
      audioPlayerRef.current = audio;
      audio.onended = () => setPlayingId(null);
      audio.play();
      setPlayingId(recordingId);
    } else {
      toast.error(t('recordings.audioLoadError'));
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const patientName = (id: string) =>
    patients.find((p) => p.id === id)?.name ?? "";

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-8 lg:px-10 h-full overflow-auto">
        {/* Header */}
        <div>
          <h2 className="font-display text-[28px] font-semibold text-foreground">
            {t('recordings.title')}
          </h2>
          <p className="text-xs text-[var(--c-text-muted)]">
            {t('recordings.subtitle')}
          </p>
        </div>

        {/* Recording Card */}
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-foreground">
                {t('recordings.recordTitle')}
              </h3>
              <p className="text-[11px] text-[var(--c-text-muted)] mt-0.5">
                {t('recordings.languageSupport')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={selectedPatient}
                onValueChange={setSelectedPatient}
              >
                <SelectTrigger className="h-9 w-[200px] bg-[var(--c-surface-alt)] border-[var(--c-border)] text-foreground text-[12px]">
                  <SelectValue placeholder={t('recordings.selectPatient')} />
                </SelectTrigger>
                <SelectContent className="bg-[var(--c-surface)] border-[var(--c-border)]">
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mic button area */}
          <div className="flex flex-col items-center gap-4 py-5">
            {!isRecording && !audioBlob && (
              <>
                <button
                  onClick={startRecording}
                  disabled={!selectedPatient}
                  className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center shadow-[0_0_30px_rgba(107,138,191,0.2)] hover:shadow-[0_0_40px_rgba(107,138,191,0.3)] transition-shadow disabled:opacity-50 disabled:shadow-none"
                >
                  <Mic className="w-8 h-8 text-white" />
                </button>
                <span className="text-[12px] text-[var(--c-text-muted)]">
                  {t('recordings.tapToStart')}
                </span>
              </>
            )}

            {isRecording && (
              <>
                <button
                  onClick={stopRecording}
                  className="w-20 h-20 rounded-full bg-[#EF4444] flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-pulse"
                >
                  <MicOff className="w-8 h-8 text-white" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
                  <span className="text-[12px] text-[#EF4444] font-mono">
                    {t('recordings.recording', { time: formatTime(recordingTime) })}
                  </span>
                </div>
                <span className="text-[11px] text-[var(--c-text-muted)]">
                  {patientName(selectedPatient)
                    ? t('recordings.speakNotes', { patient: patientName(selectedPatient) })
                    : t('recordings.speakNotesDefault')}
                </span>
              </>
            )}

            {audioBlob && !isRecording && (
              <div className="flex flex-col items-center gap-3 w-full max-w-sm">
                {audioUrl && (
                  <audio
                    controls
                    src={audioUrl}
                    className="h-8 w-full opacity-70"
                  />
                )}
                <span className="text-[11px] text-[var(--c-text-muted)] font-mono">
                  {formatTime(recordingTime)}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={uploadRecording}
                    disabled={uploading}
                    className="flex items-center gap-1.5 gradient-primary rounded-[10px] h-9 px-4 text-white text-[12px] font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    {uploading ? t('recordings.uploading') : t('recordings.uploadGenerate')}
                  </button>
                  <button
                    onClick={discardRecording}
                    className="w-9 h-9 rounded-[10px] bg-[var(--c-surface-alt)] flex items-center justify-center text-[var(--c-text-muted)] hover:text-foreground border border-[var(--c-border)]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Upload button (when no recording) */}
          {!isRecording && !audioBlob && (
            <button
              disabled
              className="w-full h-[42px] rounded-[10px] bg-[var(--c-surface-alt)] border border-[var(--c-border)] flex items-center justify-center gap-2 text-[12px] text-[var(--c-text-secondary)]"
            >
              <Upload className="w-3.5 h-3.5 text-[var(--c-text-muted)]" /> {t('recordings.uploadGenerate')}
            </button>
          )}
        </div>

        {/* Previous Recordings */}
        <div className="flex flex-col gap-3">
          <h3 className="font-display text-base font-semibold text-foreground">
            {t('recordings.previousRecordings')}
          </h3>

          {recordings.length === 0 ? (
            <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-16 text-[var(--c-text-muted)]">
              <Mic className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-[13px]">{t('recordings.noRecordings')}</p>
              <p className="text-[11px] mt-1">
                {t('recordings.noRecordingsHint')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recordings.map((rec) => {
                const reports = reportsByRecording[rec.id] ?? [];
                const isExpanded = expandedRec === rec.id;
                const isProcessingThis = processing === rec.id;

                return (
                  <Collapsible
                    key={rec.id}
                    open={isExpanded}
                    onOpenChange={(open) =>
                      setExpandedRec(open ? rec.id : null)
                    }
                  >
                    <CollapsibleTrigger asChild>
                      <div className="glass-card rounded-xl flex items-center gap-3 px-5 py-4 cursor-pointer hover:border-white/[0.08] transition-colors">
                        {/* Play */}
                        <button
                          className="shrink-0 w-9 h-9 rounded-[10px] bg-[var(--c-border)] flex items-center justify-center hover:bg-[var(--c-surface-hover)] transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            playAudio(rec.storage_path, rec.id);
                          }}
                        >
                          {playingId === rec.id ? (
                            <Pause className="w-3.5 h-3.5 text-foreground" />
                          ) : (
                            <Play className="w-3.5 h-3.5 ml-0.5 text-foreground" />
                          )}
                        </button>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-foreground truncate">
                              {rec.patients?.name ?? "Unknown Patient"}
                              {rec.duration_seconds != null &&
                                ` — ${
                                  new Date().getHours() >= 7 &&
                                  new Date().getHours() < 15
                                    ? t('recordings.dayShift')
                                    : new Date().getHours() >= 15 &&
                                        new Date().getHours() < 23
                                      ? t('recordings.eveningShift')
                                      : t('recordings.nightShift')
                                } Shift Report`}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--c-text-muted)]">
                            {rec.duration_seconds != null &&
                              `${formatTime(rec.duration_seconds)} · `}
                            {new Date(rec.created_at).toLocaleString()}
                          </p>
                        </div>

                        {/* Status badge */}
                        {isProcessingThis ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--c-primary)] bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                            <Loader2 className="w-3 h-3 animate-spin" />{" "}
                            {t('recordings.processing')}
                          </span>
                        ) : rec.processed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--c-accent)] bg-accent/10 px-2 py-0.5 rounded-full shrink-0">
                            <CheckCircle2 className="w-3 h-3" /> {t('recordings.processed')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--c-warning)] bg-warning/10 px-2 py-0.5 rounded-full shrink-0">
                            <AlertCircle className="w-3 h-3" /> {t('recordings.pending')}
                          </span>
                        )}

                        {/* Retry */}
                        {!rec.processed && !isProcessingThis && (
                          <button
                            className="shrink-0 text-[11px] text-[var(--c-text-muted)] hover:text-foreground flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              retryProcessing(rec.id);
                            }}
                          >
                            <RefreshCw className="w-3 h-3" /> {t('recordings.retry')}
                          </button>
                        )}

                        {/* Chevron */}
                        <span className="shrink-0 text-[var(--c-text-muted)]">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </span>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-5 pb-4 pt-2 space-y-3 bg-[var(--c-surface)] rounded-b-xl -mt-2 border border-t-0 border-white/[0.03]">
                        {/* Transcript */}
                        {rec.transcript && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--c-text-muted)] mb-1 flex items-center gap-1">
                              <Languages className="w-3 h-3" /> {t('recordings.transcript')}
                            </p>
                            <div className="bg-[var(--c-surface-alt)] border border-[var(--c-border)] rounded-[10px] p-3 text-[13px] text-[var(--c-text-secondary)] leading-relaxed max-h-36 overflow-y-auto">
                              {rec.transcript}
                            </div>
                          </div>
                        )}

                        {/* Generated Handoff Report */}
                        {reports.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--c-text-muted)] mb-1.5 flex items-center gap-1">
                              <FileText className="w-3 h-3" /> {t('recordings.generatedReport')}
                            </p>
                            <div className="space-y-3">
                              {reports.map((report) => (
                                <HandoffCard
                                  key={report.id}
                                  report={report}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {rec.processed && reports.length === 0 && (
                          <p className="text-[11px] text-[var(--c-text-muted)] italic">
                            {t('recordings.noReportGenerated')}
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
