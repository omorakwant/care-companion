import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Wound Analysis Types ─────────────────────────────────────────

interface InfectionSigns {
  erythema: boolean;
  pus: boolean;
  odor: boolean;
  warmth: boolean;
}

interface WoundAnalysis {
  wound_type: string;
  approximate_size_cm: string;
  infection_signs: InfectionSigns;
  healing_stage: string;
  severity: string;
  drainage: string;
  recommendations: string[];
}

const MOCK_ANALYSIS: WoundAnalysis = {
  wound_type: "Surgical incision",
  approximate_size_cm: "4.5 x 1.2",
  infection_signs: {
    erythema: false,
    pus: false,
    odor: false,
    warmth: true,
  },
  healing_stage: "proliferative",
  severity: "mild",
  drainage: "serous",
  recommendations: [
    "Continue current dressing protocol",
    "Monitor for signs of infection",
    "Follow up in 48 hours",
  ],
};

// ─── Minimax Vision API ────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a clinical wound assessment AI. Analyze the wound image and return a JSON object with: wound_type (string), approximate_size_cm (string), infection_signs (object with erythema: boolean, pus: boolean, odor: boolean, warmth: boolean), healing_stage (string: inflammatory/proliferative/maturation/chronic), severity (string: mild/moderate/severe), drainage (string: none/serous/sanguineous/purulent), recommendations (string array). Return ONLY valid JSON.`;

/**
 * Call Minimax Vision API to analyze a wound image.
 * Uses chat completions endpoint with image_url in user message content.
 */
async function analyzeWoundWithMinimax(
  imageUrl: string,
  apiKey: string
): Promise<WoundAnalysis> {
  const res = await fetch("https://api.minimax.io/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "MiniMax-M2.5",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this wound image." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Minimax Vision API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";

  if (!content) {
    throw new Error("Minimax returned empty response");
  }

  try {
    const cleaned = content
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    return JSON.parse(cleaned) as WoundAnalysis;
  } catch (e) {
    console.error("Failed to parse Minimax response:", e, "Raw:", content);
    throw new Error(`Invalid JSON in Minimax response: ${content.slice(0, 200)}`);
  }
}

// ─── Main handler ────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { wound_entry_id, image_url, patient_id } = body;

    let imageUrl: string;
    let woundEntryId: string | null = null;

    if (wound_entry_id) {
      woundEntryId = wound_entry_id;
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: entry, error: fetchError } = await supabase
        .from("wound_entries")
        .select("image_url")
        .eq("id", wound_entry_id)
        .single();

      if (fetchError || !entry) {
        throw new Error("Wound entry not found");
      }

      imageUrl = entry.image_url;
    } else if (image_url && patient_id) {
      imageUrl = image_url;
    } else {
      throw new Error(
        "Either wound_entry_id or (image_url and patient_id) is required"
      );
    }

    const minimaxKey = Deno.env.get("MINIMAX_API_KEY");
    let analysis: WoundAnalysis;

    if (!minimaxKey) {
      console.warn("MINIMAX_API_KEY not set — returning mock analysis");
      analysis = MOCK_ANALYSIS;
    } else {
      analysis = await analyzeWoundWithMinimax(imageUrl, minimaxKey);
    }

    if (woundEntryId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase
        .from("wound_entries")
        .update({
          analysis_json: analysis as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        })
        .eq("id", woundEntryId);
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analyze wound error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
