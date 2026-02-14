import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface HandoffReportRow {
  id: string;
  summary_text: string;
  consciousness: string | null;
  pain_level: number | null;
  risk_factors: string[] | unknown;
  access_lines: string[] | unknown;
  pending_labs: string[] | unknown;
  to_do_items: string[] | unknown;
}

function arrToText(arr: string[] | unknown): string {
  if (!Array.isArray(arr)) return "";
  return arr.filter((x): x is string => typeof x === "string").join(", ");
}

function buildReportText(report: HandoffReportRow): string {
  const parts: string[] = [];

  if (report.summary_text?.trim()) {
    parts.push(`Summary: ${report.summary_text.trim()}`);
  }
  if (report.consciousness?.trim()) {
    parts.push(`Consciousness: ${report.consciousness.trim()}`);
  }
  if (report.pain_level != null) {
    parts.push(`Pain level: ${report.pain_level}`);
  }
  const risk = arrToText(report.risk_factors);
  if (risk) parts.push(`Risk factors: ${risk}`);
  const access = arrToText(report.access_lines);
  if (access) parts.push(`Access lines: ${access}`);
  const labs = arrToText(report.pending_labs);
  if (labs) parts.push(`Pending labs: ${labs}`);
  const todos = arrToText(report.to_do_items);
  if (todos) parts.push(`To do: ${todos}`);

  return parts.join("\n").trim() || "(empty report)";
}

async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get("MINIMAX_API_KEY");

  if (!apiKey) {
    console.warn("MINIMAX_API_KEY not set — using mock 384-dim vector");
    return Array.from({ length: 384 }, () => Math.random() * 2 - 1);
  }

  const res = await fetch("https://api.minimax.io/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "embo-01",
      input: [text],
      type: "db",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Minimax embedding API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length !== 384) {
    throw new Error(
      `Unexpected embedding shape: expected 384 dims, got ${embedding?.length ?? 0}`
    );
  }
  return embedding;
}

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
    const body = await req.json();
    const handoffReportId = body?.handoff_report_id as string | undefined;
    const batch = body?.batch === true;

    if (!handoffReportId && !batch) {
      return new Response(
        JSON.stringify({
          error: "Provide handoff_report_id or batch: true",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase
      .from("handoff_reports")
      .select("id, summary_text, consciousness, pain_level, risk_factors, access_lines, pending_labs, to_do_items")
      .is("embedding", null);

    if (handoffReportId) {
      query = query.eq("id", handoffReportId);
    }

    const { data: reports, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch reports: ${fetchError.message}`);
    }

    if (!reports?.length) {
      return new Response(
        JSON.stringify({ embedded: 0, message: "No unembedded reports found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let embedded = 0;
    for (const report of reports as HandoffReportRow[]) {
      try {
        const text = buildReportText(report);
        const embedding = await getEmbedding(text);

        const { error: updateError } = await supabase
          .from("handoff_reports")
          .update({ embedding })
          .eq("id", report.id);

        if (updateError) {
          console.error(`Failed to update report ${report.id}:`, updateError);
          continue;
        }
        embedded++;
      } catch (err) {
        console.error(`Failed to embed report ${report.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ embedded }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Embed report error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
