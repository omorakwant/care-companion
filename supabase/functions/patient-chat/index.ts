import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Types ───────────────────────────────────────────────────────

interface RequestBody {
  patient_id: string;
  question: string;
}

interface HandoffMatch {
  id: string;
  summary_text: string | null;
  shift_type: string | null;
  pain_level: number | null;
  consciousness: string | null;
  risk_factors: string[] | null;
  to_do_items: string[] | null;
  created_at: string;
  similarity: number;
}

interface Source {
  id: string;
  shift_type: string;
  created_at: string;
  similarity: number;
}

// ─── Embedding (Minimax embo-01) ───────────────────────────────────

async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get("MINIMAX_API_KEY");
  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY not configured");
  }

  const res = await fetch("https://api.minimax.io/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "embo-01",
      texts: [text],
      type: "query",
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Minimax embeddings error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length !== 384) {
    throw new Error("Invalid embedding response from Minimax");
  }
  return embedding;
}

// ─── Build context from matched reports ────────────────────────────

function buildContext(reports: HandoffMatch[]): string {
  return reports
    .map((r, i) => {
      const shift = r.shift_type ?? "unknown";
      const date = r.created_at
        ? new Date(r.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "unknown";
      const summary = r.summary_text ?? "(no summary)";
      const pain = r.pain_level != null ? `${r.pain_level}/10` : "N/A";
      const consciousness = r.consciousness ?? "N/A";
      const risks =
        Array.isArray(r.risk_factors) && r.risk_factors.length > 0
          ? r.risk_factors.join("; ")
          : "None noted";
      const todos =
        Array.isArray(r.to_do_items) && r.to_do_items.length > 0
          ? r.to_do_items.join("; ")
          : "None noted";

      return `[Report ${i + 1}] Shift: ${shift} | Date: ${date}
Summary: ${summary}
Pain level: ${pain} | Consciousness: ${consciousness}
Risk factors: ${risks}
To-do items: ${todos}`;
    })
    .join("\n\n---\n\n");
}

// ─── Generate answer (Groq) ───────────────────────────────────────

async function generateAnswer(
  context: string,
  question: string
): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const systemPrompt =
    "You are a helpful nursing assistant for CareFlow hospital system. Answer the question based ONLY on the provided patient chart context. Be concise and clinically relevant. If the answer is not in the context, say 'I don't see that information in the available charts.' Always cite which shift report you're referencing.";

  const userMessage = `Context from patient charts:\n\n${context}\n\nQuestion: ${question}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  return content ?? "Unable to generate an answer.";
}

// ─── Mock response when API keys are missing ───────────────────────

const MOCK_RESPONSE = {
  answer:
    "Based on the most recent day shift report, the patient's pain level was 4/10 with alert consciousness. The nurse noted two pending lab results and recommended monitoring vitals every 4 hours. [Day Shift - Feb 14]",
  sources: [] as Source[],
};

// ─── Main handler ──────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      }
    );
  }

  try {
    const body = (await req.json()) as RequestBody;
    const { patient_id, question } = body;

    if (!patient_id || !question) {
      return new Response(
        JSON.stringify({ error: "patient_id and question are required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const minimaxKey = Deno.env.get("MINIMAX_API_KEY");
    const groqKey = Deno.env.get("GROQ_API_KEY");

    if (!minimaxKey || !groqKey) {
      return new Response(JSON.stringify(MOCK_RESPONSE), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Generate query embedding
    const embedding = await getEmbedding(question);

    // 2. Retrieve matching handoff reports via RPC
    const { data: matches, error: rpcError } = await supabase.rpc(
      "match_handoff_reports",
      {
        query_embedding: embedding,
        match_patient_id: patient_id,
        match_threshold: 0.3,
        match_count: 3,
      }
    );

    if (rpcError) {
      console.error("RPC error:", rpcError);
      throw new Error(`Failed to match handoff reports: ${rpcError.message}`);
    }

    const reports = (matches ?? []) as HandoffMatch[];

    if (reports.length === 0) {
      return new Response(
        JSON.stringify({
          answer:
            "I don't see that information in the available charts. No matching handoff reports were found for this patient.",
          sources: [],
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Build context from matched reports
    const context = buildContext(reports);

    // 4. Generate answer with Groq
    const answer = await generateAnswer(context, question);

    // 5. Build sources array
    const sources: Source[] = reports.map((r) => ({
      id: r.id,
      shift_type: r.shift_type ?? "unknown",
      created_at: r.created_at,
      similarity: r.similarity,
    }));

    return new Response(
      JSON.stringify({ answer, sources }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Patient chat error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
