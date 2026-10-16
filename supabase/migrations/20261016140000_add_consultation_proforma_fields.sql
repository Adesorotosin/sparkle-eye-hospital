-- Add fields used by the Doctor consultation history proforma and optical instructions.
-- The consultation server action writes these fields when saving a draft.
-- IF NOT EXISTS keeps this safe for databases where some fields were added manually.

alter table public.encounters
  add column if not exists history_proforma jsonb not null default '{}'::jsonb,
  add column if not exists refraction_notes text,
  add column if not exists lens_type text;

-- Refresh PostgREST's schema cache so the new columns are available immediately.
notify pgrst, 'reload schema';
