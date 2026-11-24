-- system_settings: key/value settings for the USSG app.
-- Used by the Admin page "Sections" switches (keys like section_leads_enabled).
-- Shape matches what src/lib/backup.ts already backs up and
-- src/app/api/admin/backup/restore/route.ts already restores.
--
-- Additive only: creates one new table, touches no existing data.
-- Every optional section stays OFF until a row with value 'true' exists.

CREATE TABLE IF NOT EXISTS public.system_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,
  value       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS on with no policies: only the server (service role key) can read or
-- write. The browser never talks to this table directly.
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Make the new table visible to the REST API right away.
NOTIFY pgrst, 'reload schema';
