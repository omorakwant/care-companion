-- Enable the http extension to support Database Webhooks
-- (provides extensions.http_post, http_get, etc.)
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
