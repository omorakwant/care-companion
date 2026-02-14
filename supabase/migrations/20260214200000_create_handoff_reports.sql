-- ══════════════════════════════════════════════════════════════════
-- Pivot: Tasks → Handoff Reports
-- Creates the handoff_reports table for structured shift handoff data
-- ══════════════════════════════════════════════════════════════════

-- Shift type enum
CREATE TYPE public.shift_type AS ENUM ('day', 'night');

-- Handoff Reports table
CREATE TABLE public.handoff_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) NOT NULL,
  audio_notice_id UUID REFERENCES public.audio_notices(id) ON DELETE SET NULL,
  shift_type shift_type NOT NULL DEFAULT 'day',
  summary_text TEXT NOT NULL DEFAULT '',
  pain_level INTEGER CHECK (pain_level IS NULL OR (pain_level >= 0 AND pain_level <= 10)),
  consciousness TEXT,  -- Alert, Drowsy, Confused, Sedated, Unresponsive
  pending_labs JSONB DEFAULT '[]'::jsonb,
  access_lines JSONB DEFAULT '[]'::jsonb,
  risk_factors JSONB DEFAULT '[]'::jsonb,
  to_do_items JSONB DEFAULT '[]'::jsonb,
  transcript_excerpt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.handoff_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view handoff reports"
  ON public.handoff_reports FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create handoff reports"
  ON public.handoff_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update handoff reports"
  ON public.handoff_reports FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete handoff reports"
  ON public.handoff_reports FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_handoff_reports_updated_at
  BEFORE UPDATE ON public.handoff_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Realtime for handoff_reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.handoff_reports;
