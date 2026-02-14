import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { HandoffCard } from "@/components/HandoffCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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

const langLabels: Record<string, string> = {
  en: "English",
  eng: "English",
  fr: "French",
  fra: "French",
  fre: "French",
  ar: "Arabic",
  ara: "Arabic",
  arb: "Arabic",
  es: "Spanish",
  de: "German",
  it: "Italian",
  nl: "Dutch",
  pt: "Portuguese",
  is: "Icelandic",
};

export default function Recordings() {
  const { user } = useAuth();
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
            toast.success("AI processing complete — handoff report generated!");
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
              if (!grouped[r.audio_notice_id]) grouped[r.audio_notice_id] = [];
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      toast.error("Could not access microphone");
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

    toast.success("Uploaded! AI processing automatically...");
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
    toast.info("Retrying AI processing...");

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
        toast.success("Processing complete!");
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
      toast.error("Could not load audio");
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
    <AppLayout title="Record Shift Handoff">
      <div className="space-y-6">
        {/* Compact Recorder */}
        <div className="bg-card border rounded-lg p-5">
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Record Shift Handoff</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Record your verbal shift report. AI will extract a structured
                handoff report with patient status, vitals, risks, and to-do
                items.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Speak in <strong>French</strong>, <strong>English</strong>, or{" "}
                <strong>Standard Arabic</strong> for best accuracy. Darija has
                reduced accuracy.
              </p>
            </div>

            {/* Controls row */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5 min-w-[180px] flex-1 max-w-xs">
                <Label className="text-xs">Patient</Label>
                <Select
                  value={selectedPatient}
                  onValueChange={setSelectedPatient}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select patient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                {!isRecording && !audioBlob && (
                  <Button
                    onClick={startRecording}
                    disabled={!selectedPatient}
                    className="gap-1.5"
                  >
                    <Mic className="w-4 h-4" /> Record
                  </Button>
                )}

                {isRecording && (
                  <Button
                    onClick={stopRecording}
                    variant="destructive"
                    className="gap-1.5"
                  >
                    <MicOff className="w-4 h-4" /> Stop{" "}
                    <span className="font-mono text-xs">
                      {formatTime(recordingTime)}
                    </span>
                  </Button>
                )}

                {audioBlob && !isRecording && (
                  <>
                    <Button
                      onClick={uploadRecording}
                      disabled={uploading}
                      className="gap-1.5"
                    >
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {uploading ? "Uploading..." : "Upload & Generate Report"}
                    </Button>
                    <Button onClick={discardRecording} variant="ghost" size="icon">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Recording indicator */}
            {isRecording && (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                Recording in progress — speak your notes about{" "}
                {patientName(selectedPatient) || "the patient"}...
              </div>
            )}

            {/* Audio preview */}
            {audioBlob && !isRecording && audioUrl && (
              <div className="flex items-center gap-3 p-2.5 bg-muted/40 rounded-md">
                <audio controls src={audioUrl} className="h-8 flex-1" />
                <span className="text-xs text-muted-foreground font-mono">
                  {formatTime(recordingTime)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Recordings Table-like List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Recordings</h3>
            <span className="text-xs text-muted-foreground">
              {recordings.length} total
            </span>
          </div>

          {recordings.length === 0 ? (
            <div className="bg-card border rounded-lg flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Mic className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">No recordings yet</p>
              <p className="text-xs mt-1">
                Select a patient above and start recording
              </p>
            </div>
          ) : (
            <div className="bg-card border rounded-lg overflow-hidden divide-y">
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
                      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                        {/* Play */}
                        <button
                          className="shrink-0 w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            playAudio(rec.storage_path, rec.id);
                          }}
                        >
                          {playingId === rec.id ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5 ml-0.5" />
                          )}
                        </button>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {rec.patients?.name ?? "Unknown Patient"}
                            </span>
                            <span className="text-xs text-muted-foreground hidden sm:block">
                              {new Date(rec.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {/* Status dot */}
                            {isProcessingThis ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600">
                                <Loader2 className="w-3 h-3 animate-spin" />{" "}
                                Processing
                              </span>
                            ) : rec.processed ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                                <CheckCircle2 className="w-3 h-3" /> Processed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
                                <AlertCircle className="w-3 h-3" /> Pending
                              </span>
                            )}
                            {reports.length > 0 && (
                              <span className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5">
                                <FileText className="w-3 h-3" /> Report
                                generated
                              </span>
                            )}
                            {rec.duration_seconds != null && (
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {formatTime(rec.duration_seconds)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Retry */}
                        {!rec.processed && !isProcessingThis && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 text-xs gap-1 h-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              retryProcessing(rec.id);
                            }}
                          >
                            <RefreshCw className="w-3 h-3" /> Retry
                          </Button>
                        )}

                        {/* Chevron */}
                        <span className="shrink-0 text-muted-foreground">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </span>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-4 pb-4 pt-1 space-y-3 bg-muted/10">
                        {/* Transcript */}
                        {rec.transcript && (
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                              <Languages className="w-3 h-3" /> Transcript
                            </p>
                            <div className="bg-card border rounded-md p-3 text-sm leading-relaxed max-h-36 overflow-y-auto">
                              {rec.transcript}
                            </div>
                          </div>
                        )}

                        {/* Generated Handoff Report */}
                        {reports.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Generated
                              Handoff Report
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
                          <p className="text-xs text-muted-foreground italic">
                            No handoff report was generated from this recording.
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
