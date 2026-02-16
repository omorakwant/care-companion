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
  -- SECURITY: Read secrets from environment, never hardcode keys
  base_url text := current_setting('app.settings.supabase_url', true);
  service_key text := current_setting('app.settings.service_role_key', true);
BEGIN
  IF base_url IS NULL OR service_key IS NULL THEN
    RAISE WARNING 'Supabase URL or service role key not configured in app.settings';
    RETURN NEW;
  END IF;

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
