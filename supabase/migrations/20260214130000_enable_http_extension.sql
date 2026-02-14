-- Enable the http extension (pgsql-http) in the extensions schema
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Enable pg_net for async webhook support
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Bridge function: some Database Webhooks/triggers call extensions.http_post
-- with (url text, body jsonb, headers jsonb) but the http extension provides
-- a different signature. This wrapper delegates to net.http_post from pg_net.
CREATE OR REPLACE FUNCTION extensions.http_post(
  url text,
  body jsonb DEFAULT '{}'::jsonb,
  headers jsonb DEFAULT '{"Content-Type": "application/json"}'::jsonb
)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT net.http_post(
    url := url,
    body := body,
    headers := headers
  );
$$;
