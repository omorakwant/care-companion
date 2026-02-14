import { useEffect, useState, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Mic, MicOff, Upload, Clock } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Patient = Tables<"patients">;
type AudioNotice = Tables<"audio_notices">;

export default function Recordings() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [recordings, setRecordings] = useState<AudioNotice[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    supabase.from("patients").select("id, name").order("name").then(({ data }) => {
      if (data) setPatients(data as Patient[]);
    });
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    const { data } = await supabase
      .from("audio_notices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setRecordings(data);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const uploadRecording = async () => {
    if (!audioBlob || !selectedPatient || !user) return;
    setUploading(true);

    const fileName = `${user.id}/${Date.now()}.webm`;
    const { error: uploadError } = await supabase.storage
      .from("audio-recordings")
      .upload(fileName, audioBlob, { contentType: "audio/webm" });

    if (uploadError) { toast.error(uploadError.message); setUploading(false); return; }

    const { error } = await supabase.from("audio_notices").insert({
      patient_id: selectedPatient,
      recorded_by: user.id,
      storage_path: fileName,
    });

    if (error) { toast.error(error.message); setUploading(false); return; }

    toast.success("Recording uploaded! AI processing will begin shortly.");
    setAudioBlob(null);
    setSelectedPatient("");
    setUploading(false);
    fetchRecordings();
  };

  return (
    <AppLayout title="Audio Recordings">
      <div className="space-y-6">
        {/* Recording section */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold">New Recording</h2>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Select Patient</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                  <SelectTrigger><SelectValue placeholder="Choose patient..." /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                {!isRecording ? (
                  <Button onClick={startRecording} variant="outline" className="gap-2" disabled={!selectedPatient}>
                    <Mic className="w-4 h-4" /> Start Recording
                  </Button>
                ) : (
                  <Button onClick={stopRecording} variant="destructive" className="gap-2 animate-pulse">
                    <MicOff className="w-4 h-4" /> Stop Recording
                  </Button>
                )}

                {audioBlob && (
                  <Button onClick={uploadRecording} disabled={uploading} className="gap-2">
                    <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Upload & Process"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent recordings */}
        <div className="space-y-2">
          <h2 className="font-semibold">Recent Recordings</h2>
          {recordings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Mic className="w-10 h-10 mb-2" />
                <p>No recordings yet</p>
              </CardContent>
            </Card>
          ) : (
            recordings.map((rec) => (
              <Card key={rec.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{new Date(rec.created_at).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {rec.processed ? "Processed" : "Awaiting processing"}
                      {rec.transcript && ` · ${rec.transcript.slice(0, 80)}...`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
