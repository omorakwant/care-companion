-- Enable pg_net for HTTP calls from Postgres
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function: auto-call process-audio edge function on new audio_notices
CREATE OR REPLACE FUNCTION public.trigger_process_audio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  base_url text := 'https://vazabyivbhzaakunjcpp.supabase.co';
  service_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhemFieWl2Ymh6YWFrdW5qY3BwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTAyMjc5OSwiZXhwIjoyMDg2NTk4Nzk5fQ.XziKJATrLqI2HCIgK4aFEMNTw3_xfh1fudtMMr5AOho';
BEGIN
  PERFORM extensions.http_post(
    url := base_url || '/functions/v1/process-audio',
    body := jsonb_build_object('audio_notice_id', NEW.id::text),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    )
  );
  RETURN NEW;
END;
$$;

-- Fire trigger after every new audio recording is inserted
CREATE TRIGGER on_audio_notice_inserted
  AFTER INSERT ON public.audio_notices
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_process_audio();
