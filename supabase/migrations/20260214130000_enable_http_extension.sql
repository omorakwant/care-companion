-- Enable pg_net extension to support Database Webhooks
-- (provides extensions.http_post used by Supabase webhooks)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
