-- Enable Realtime for audio_notices and tasks so the UI auto-updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.audio_notices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
