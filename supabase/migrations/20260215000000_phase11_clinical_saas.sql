-- Phase 11: Clinical SaaS Features (Wound Vision, RAG Chat, Handoff Accountability)
-- ================================================================================

-- 1. Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to handoff_reports for RAG search
ALTER TABLE handoff_reports
  ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_handoff_reports_embedding
  ON handoff_reports USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 3. Wound Entries table — stores AI analysis of wound images
CREATE TABLE IF NOT EXISTS wound_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  analysis_json JSONB DEFAULT '{}'::jsonb,
  doctor_notes TEXT DEFAULT '',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies for wound_entries
ALTER TABLE wound_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view wound entries"
  ON wound_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff and admin can insert wound entries"
  ON wound_entries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff and admin can update wound entries"
  ON wound_entries FOR UPDATE
  TO authenticated
  USING (true);

-- 4. Handoff Acknowledgements table — legal acceptance workflow
CREATE TABLE IF NOT EXISTS handoff_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_id UUID NOT NULL REFERENCES handoff_reports(id) ON DELETE CASCADE,
  accepted_by UUID NOT NULL REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signature_hash TEXT NOT NULL,
  UNIQUE(handoff_id, accepted_by)
);

ALTER TABLE handoff_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view acknowledgements"
  ON handoff_acknowledgements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert acknowledgements"
  ON handoff_acknowledgements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = accepted_by);

-- 5. Helper function for vector similarity search
CREATE OR REPLACE FUNCTION match_handoff_reports(
  query_embedding vector(384),
  match_patient_id UUID,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  summary_text TEXT,
  shift_type TEXT,
  pain_level INT,
  consciousness TEXT,
  risk_factors TEXT[],
  to_do_items TEXT[],
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    hr.id,
    hr.summary_text,
    hr.shift_type::TEXT,
    hr.pain_level::INT,
    hr.consciousness,
    hr.risk_factors,
    hr.to_do_items,
    hr.created_at,
    1 - (hr.embedding <=> query_embedding) AS similarity
  FROM handoff_reports hr
  WHERE hr.patient_id = match_patient_id
    AND hr.embedding IS NOT NULL
    AND 1 - (hr.embedding <=> query_embedding) > match_threshold
  ORDER BY hr.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
