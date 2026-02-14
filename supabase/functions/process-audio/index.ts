import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Transcription (ElevenLabs Scribe v2) ────────────────────────

interface TranscriptionResult {
  text: string;
  language_code: string;
  language_probability: number;
}

/**
 * Transcribe audio using ElevenLabs Scribe v2.
 * Auto-detects language — supports English, French, Arabic, and 90+ others.
 */
async function transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
  const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!elevenLabsKey) {
    throw new Error("ELEVENLABS_API_KEY not configured");
  }

  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");
  formData.append("model_id", "scribe_v2");
  // No language_code → auto-detect (supports EN, FR, AR natively)
  formData.append("tag_audio_events", "false");

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": elevenLabsKey },
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`ElevenLabs STT error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return {
    text: data.text ?? "",
    language_code: data.language_code ?? "unknown",
    language_probability: data.language_probability ?? 0,
  };
}

// ─── Translation (Darija / Arabic → French) ─────────────────────

/** ISO-639 codes that indicate Arabic (including Darija). */
const ARABIC_CODES = new Set(["ara", "arb", "ary"]);

/**
 * Translate an Arabic / Darija transcript to French using MiniMax M2.5.
 *
 * Why French? Moroccan hospitals use French for medical records, and
 * MiniMax handles French far better than Darija for task extraction.
 *
 * Returns the French translation, or the original text if translation fails.
 */
async function translateToFrench(
  transcript: string,
  minimaxKey: string
): Promise<{ translated: string; didTranslate: boolean }> {
  const systemPrompt = `You are a professional medical translator.

TASK: Translate the following text from Moroccan Arabic (Darija) or Modern Standard Arabic into French.

RULES:
1. The input may be Darija (Moroccan dialect), MSA, or a mix of both with French medical terms.
2. Preserve ALL medical terminology accurately — drug names, dosages, procedures, anatomy.
3. If a word is already in French or Latin (medical terms), keep it as-is.
4. Translate naturally into standard French as used in Moroccan hospitals.
5. Do NOT add explanations, notes, or commentary.
6. Return ONLY the French translation, nothing else.`;

  try {
    const res = await fetch("https://api.minimax.io/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${minimaxKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "MiniMax-M2.5",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Translate this to French:\n\n"${transcript}"`,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Translation API error:", errorText);
      return { translated: transcript, didTranslate: false };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";

    if (!content) {
      console.warn("Translation returned empty — using original transcript");
      return { translated: transcript, didTranslate: false };
    }

    console.log(
      `Translated Arabic/Darija → French (${transcript.length} → ${content.length} chars)`
    );
    return { translated: content, didTranslate: true };
  } catch (err) {
    console.error("Translation failed:", err);
    return { translated: transcript, didTranslate: false };
  }
}

// ─── Task Extraction (MiniMax M2.5) ──────────────────────────────

interface ExtractedTask {
  title: string;
  description: string;
  priority: string;
  category: string;
}

/**
 * Extract structured medical tasks from a transcript using MiniMax M2.5.
 *
 * Expects the transcript to be in a language MiniMax handles well
 * (English or French). Arabic/Darija should be translated to French
 * before calling this function.
 */
async function extractTasks(
  transcript: string,
  outputLanguage: string
): Promise<ExtractedTask[]> {
  const minimaxKey = Deno.env.get("MINIMAX_API_KEY");
  if (!minimaxKey) {
    console.warn("MINIMAX_API_KEY not set — skipping task extraction");
    return [];
  }

  const systemPrompt = `You are a medical task extractor for a hospital care management system.

IMPORTANT RULES:
1. The transcript is in ${outputLanguage}.
2. Write the task "title" and "description" in ${outputLanguage}.
3. Extract EVERY actionable medical task mentioned — medications, vitals checks, lab orders, imaging, consultations, nursing care, discharge steps, follow-ups.
4. If the transcript is conversational or contains filler words, ignore those and focus on the medical actions.
5. Be thorough — extract ALL tasks, even small ones like "check temperature" or "change bandage".

Return a JSON object with a "tasks" array. Each task:
- "title": short actionable title (max 80 chars) in ${outputLanguage}
- "description": detailed description in ${outputLanguage}
- "priority": "low", "medium", or "high" based on clinical urgency
- "category": one of "Medication", "Vitals", "Lab Work", "Imaging", "Consultation", "Nursing Care", "Discharge Planning", "Other"

If no tasks can be extracted, return {"tasks": []}.
Return ONLY valid JSON — no markdown fences, no extra text.`;

  const res = await fetch("https://api.minimax.io/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${minimaxKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "MiniMax-M2.5",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Extract all medical tasks from this transcript:\n\n"${transcript}"`,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("MiniMax API error:", errorText);
    return [];
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  try {
    const cleaned = content
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    return parsed.tasks || [];
  } catch (e) {
    console.error("Failed to parse MiniMax response:", e, "Raw:", content);
    return [];
  }
}

// ─── Main handler ────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { audio_notice_id } = await req.json();
    if (!audio_notice_id) {
      throw new Error("audio_notice_id is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch the audio notice
    const { data: notice, error: noticeError } = await supabase
      .from("audio_notices")
      .select("*")
      .eq("id", audio_notice_id)
      .single();

    if (noticeError || !notice) {
      throw new Error("Audio notice not found");
    }

    if (notice.processed) {
      return new Response(
        JSON.stringify({ success: true, message: "Already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Download audio from storage
    const { data: audioData, error: downloadError } = await supabase.storage
      .from("audio-recordings")
      .download(notice.storage_path);

    if (downloadError || !audioData) {
      throw new Error(`Could not download audio: ${downloadError?.message}`);
    }

    // 3. Transcribe — auto-detect language (EN / FR / AR / Darija)
    let transcript = "";
    let detectedLanguage = "unknown";
    try {
      const result = await transcribeAudio(audioData);
      transcript = result.text;
      detectedLanguage = result.language_code;
      console.log(
        `Transcribed: lang=${detectedLanguage} (${result.language_probability}), length=${transcript.length}`
      );
    } catch (err) {
      console.error("Transcription failed:", err);
      transcript = `[Transcription failed: ${(err as Error).message}]`;
    }

    // 4. Translate Arabic/Darija → French (hybrid approach)
    //    Darija is poorly supported by most LLMs, so we translate to
    //    French first. French is the medical lingua franca in Morocco.
    let translatedTranscript = transcript;
    let wasTranslated = false;
    let taskLanguage = "French"; // default output language for tasks

    if (
      transcript &&
      !transcript.startsWith("[Transcription failed") &&
      ARABIC_CODES.has(detectedLanguage)
    ) {
      const minimaxKey = Deno.env.get("MINIMAX_API_KEY");
      if (minimaxKey) {
        console.log(
          `Detected Arabic/Darija (${detectedLanguage}) — translating to French...`
        );
        const result = await translateToFrench(transcript, minimaxKey);
        translatedTranscript = result.translated;
        wasTranslated = result.didTranslate;
      }
    } else if (detectedLanguage === "eng") {
      taskLanguage = "English";
    } else if (
      detectedLanguage === "fra" ||
      detectedLanguage === "fre"
    ) {
      taskLanguage = "French";
    } else {
      // For other languages, default to French output
      taskLanguage = "French";
    }

    // 5. Extract tasks from the (possibly translated) transcript
    let extractedTasks: ExtractedTask[] = [];
    if (translatedTranscript && !translatedTranscript.startsWith("[Transcription failed")) {
      extractedTasks = await extractTasks(translatedTranscript, taskLanguage);
    }

    // 6. Update audio notice — store original transcript
    await supabase
      .from("audio_notices")
      .update({
        transcript,
        processed: true,
      })
      .eq("id", audio_notice_id);

    // 7. Create tasks in database
    let tasksCreated = 0;
    for (const task of extractedTasks) {
      const validPriority = ["low", "medium", "high"].includes(task.priority)
        ? task.priority
        : "medium";

      const { error: taskError } = await supabase.from("tasks").insert({
        title: task.title,
        description: task.description || null,
        priority: validPriority,
        category: task.category || "Other",
        patient_id: notice.patient_id,
        audio_notice_id: notice.id,
        created_by: notice.recorded_by,
        transcript_excerpt: transcript.slice(0, 200),
      });

      if (!taskError) tasksCreated++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        transcript,
        translated_transcript: wasTranslated ? translatedTranscript : null,
        was_translated: wasTranslated,
        language: detectedLanguage,
        task_language: taskLanguage,
        tasks_created: tasksCreated,
        tasks: extractedTasks,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Process audio error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
