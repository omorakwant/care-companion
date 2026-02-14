import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  User,
  ListTodo,
  ChevronDown,
  ChevronRight,
  Languages,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Patient = Tables<"patients">;
type AudioNotice = Tables<"audio_notices"> & {
  patients?: { name: string } | null;
};
type Task = Tables<"tasks">;

const priorityStyles: Record<string, string> = {
  low: "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]",
  medium: "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]",
  high: "bg-destructive/15 text-destructive",
};

const langLabels: Record<string, string> = {
  eng: "English",
  fra: "French",
  fre: "French",
  ara: "Arabic",
  arb: "Arabic",
};

export default function Recordings() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedPatient = searchParams.get("patient") ?? "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [recordings, setRecordings] = useState<AudioNotice[]>([]);
  const [tasksByRecording, setTasksByRecording] = useState<
    Record<string, Task[]>
  >({});
  const [selectedPatient, setSelectedPatient] = useState<string>(
    preselectedPatient
  );
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
    return () => {
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
      // Fetch tasks for all recordings
      const ids = data.map((r) => r.id);
      if (ids.length > 0) {
        const { data: tasks } = await supabase
          .from("tasks")
          .select("*")
          .in("audio_notice_id", ids)
          .order("priority", { ascending: false });
        if (tasks) {
          const grouped: Record<string, Task[]> = {};
          tasks.forEach((t) => {
            if (t.audio_notice_id) {
              if (!grouped[t.audio_notice_id]) grouped[t.audio_notice_id] = [];
              grouped[t.audio_notice_id].push(t);
            }
          });
          setTasksByRecording(grouped);
        }
      }
    }
  };

  // ─── Recording controls ──────────────────────────────────────

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

  // ─── Upload & Process (one flow) ────────────────────────────

  const uploadAndProcess = async () => {
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

    toast.success("Uploaded! AI is transcribing & generating tasks...");
    discardRecording();
    setUploading(false);
    fetchRecordings();

    // Trigger AI processing
    if (insertData) {
      processAudio(insertData.id);
    }
  };

  const processAudio = async (audioNoticeId: string) => {
    setProcessing(audioNoticeId);
    setExpandedRec(audioNoticeId);

    try {
      const { data, error } = await supabase.functions.invoke(
        "process-audio",
        { body: { audio_notice_id: audioNoticeId } }
      );

      if (error) {
        console.error("Edge function error:", error);
        toast.error("AI processing failed. You can retry.");
      } else if (data?.success) {
        const lang = data.language
          ? langLabels[data.language] || data.language
          : "";
        const msg =
          data.tasks_created > 0
            ? `${lang ? lang + " detected. " : ""}${data.tasks_created} task(s) auto-generated!`
            : `Transcribed${lang ? ` (${lang})` : ""}. No tasks extracted.`;
        toast.success(msg);
      }
    } catch (err) {
      console.error("Processing error:", err);
      toast.error(
        "AI processing failed. Edge function may not be deployed yet."
      );
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
    <AppLayout title="Audio → Tasks">
      <div className="space-y-6">
        {/* ── Quick Record Card ─────────────────────────────── */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="font-semibold text-lg">
                    Record & Auto-Generate Tasks
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Speak in <strong>English</strong>,{" "}
                    <strong>French</strong>, or <strong>Arabic</strong> — AI
                    will transcribe and create tasks automatically.
                  </p>
                </div>

                {/* Patient selector */}
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5 min-w-[200px] flex-1 max-w-xs">
                    <Label className="text-xs">Patient</Label>
                    <Select
                      value={selectedPatient}
                      onValueChange={setSelectedPatient}
                    >
                      <SelectTrigger>
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

                  {/* Recording controls — single row */}
                  <div className="flex items-center gap-2">
                    {!isRecording && !audioBlob && (
                      <Button
                        onClick={startRecording}
                        disabled={!selectedPatient}
                        className="gap-2"
                        size="lg"
                      >
                        <Mic className="w-4 h-4" /> Record
                      </Button>
                    )}

                    {isRecording && (
                      <Button
                        onClick={stopRecording}
                        variant="destructive"
                        size="lg"
                        className="gap-2"
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
                          onClick={uploadAndProcess}
                          disabled={uploading}
                          size="lg"
                          className="gap-2"
                        >
                          {uploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          {uploading ? "Uploading..." : "Process with AI"}
                        </Button>
                        <Button
                          onClick={discardRecording}
                          variant="ghost"
                          size="lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Recording indicator */}
                {isRecording && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    Recording in progress — speak your notes about{" "}
                    {patientName(selectedPatient) || "the patient"}...
                  </div>
                )}

                {/* Audio preview */}
                {audioBlob && !isRecording && audioUrl && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <audio controls src={audioUrl} className="h-8 flex-1" />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatTime(recordingTime)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Recordings List with Inline Tasks ─────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Processed Recordings</h2>
            <p className="text-xs text-muted-foreground">
              {recordings.length} recording(s)
            </p>
          </div>

          {recordings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Mic className="w-10 h-10 mb-2" />
                <p>No recordings yet</p>
                <p className="text-xs mt-1">
                  Select a patient above and start recording
                </p>
              </CardContent>
            </Card>
          ) : (
            recordings.map((rec) => {
              const tasks = tasksByRecording[rec.id] ?? [];
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
                  <Card
                    className={`transition-shadow ${isExpanded ? "shadow-md ring-1 ring-primary/20" : "hover:shadow-md"}`}
                  >
                    <CollapsibleTrigger asChild>
                      <CardContent className="p-4 cursor-pointer">
                        <div className="flex items-center gap-3">
                          {/* Play button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-9 w-9"
                            onClick={(e) => {
                              e.stopPropagation();
                              playAudio(rec.storage_path, rec.id);
                            }}
                          >
                            {playingId === rec.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium">
                                {rec.patients?.name ?? "Unknown Patient"}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {new Date(rec.created_at).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {isProcessingThis ? (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-primary/15 text-primary"
                                >
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  AI Processing...
                                </Badge>
                              ) : rec.processed ? (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Processed
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]"
                                >
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                              {tasks.length > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-primary/10 text-primary"
                                >
                                  <ListTodo className="w-3 h-3 mr-1" />
                                  {tasks.length} task(s) generated
                                </Badge>
                              )}
                              {rec.duration_seconds != null && (
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(rec.duration_seconds)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Expand indicator */}
                          <div className="shrink-0 text-muted-foreground">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>

                          {/* Retry for unprocessed */}
                          {!rec.processed && !isProcessingThis && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="shrink-0 text-xs gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                processAudio(rec.id);
                              }}
                            >
                              <Sparkles className="w-3 h-3" /> Process
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-3 border-t pt-3">
                        {/* Transcript */}
                        {rec.transcript && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                              <Languages className="w-3 h-3" /> Transcript
                            </p>
                            <div className="bg-muted/50 rounded-md p-3 text-sm leading-relaxed max-h-40 overflow-y-auto">
                              {rec.transcript}
                            </div>
                          </div>
                        )}

                        {/* Generated Tasks */}
                        {tasks.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                              <ListTodo className="w-3 h-3" /> Auto-Generated
                              Tasks ({tasks.length})
                            </p>
                            <div className="space-y-1.5">
                              {tasks.map((task) => (
                                <div
                                  key={task.id}
                                  className="flex items-center gap-2 p-2 rounded-md bg-card border text-sm"
                                >
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0 shrink-0 ${priorityStyles[task.priority]}`}
                                  >
                                    {task.priority}
                                  </Badge>
                                  <span className="flex-1 truncate font-medium">
                                    {task.title}
                                  </span>
                                  {task.category && (
                                    <span className="text-xs text-muted-foreground shrink-0">
                                      {task.category}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {rec.processed && tasks.length === 0 && (
                          <p className="text-sm text-muted-foreground italic">
                            No tasks were extracted from this recording.
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
