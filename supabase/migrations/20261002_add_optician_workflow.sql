-- Sparkle Eye Specialist Hospital
-- Optician / Optical Dispensing workflow foundation

create table if not exists public.optical_orders (
  id uuid primary key default gen_random_uuid(),

  patient_id uuid not null
    references public.patients(id)
    on delete cascade,

  optometry_encounter_id uuid
    references public.encounters(id)
    on delete set null,

  status text not null default 'referred'
    check (
      status in (
        'referred',
        'measurements',
        'ready_for_dispense',
        'collected'
      )
    ),

  -- Optical measurements
  pd_binocular text,
  pd_od text,
  pd_os text,

  segment_height_od text,
  segment_height_os text,

  -- Frame / lens selection
  frame_selection text,
  lens_type text,
  lens_material text,
  lens_coating text,

  -- Dispensing information
  dispensing_notes text,

  referred_at timestamptz not null default now(),
  measurements_started_at timestamptz,
  ready_at timestamptz,
  collected_at timestamptz,

  recorded_by uuid references public.staff(id),
  collected_by uuid references public.staff(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_optical_orders_patient
  on public.optical_orders(patient_id);

create index if not exists idx_optical_orders_status
  on public.optical_orders(status);

create index if not exists idx_optical_orders_encounter
  on public.optical_orders(optometry_encounter_id);

create index if not exists idx_optical_orders_created_at
  on public.optical_orders(created_at desc);