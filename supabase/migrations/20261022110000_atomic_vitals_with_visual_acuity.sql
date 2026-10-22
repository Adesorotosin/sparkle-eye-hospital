-- Keep this migration compatible with fresh schema installs and upgraded projects.
ALTER TABLE public.vitals
  ADD COLUMN IF NOT EXISTS visual_acuity_od_pinhole text,
  ADD COLUMN IF NOT EXISTS visual_acuity_os_pinhole text,
  ADD COLUMN IF NOT EXISTS visual_acuity_od_glasses text,
  ADD COLUMN IF NOT EXISTS visual_acuity_os_glasses text,
  ADD COLUMN IF NOT EXISTS visual_acuity_ou_glasses text,
  ADD COLUMN IF NOT EXISTS visual_acuity_od_near text,
  ADD COLUMN IF NOT EXISTS visual_acuity_os_near text,
  ADD COLUMN IF NOT EXISTS visual_acuity_ou_near text;

-- Save all triage measurements and the queue transition in one transaction.
-- This is additive: the legacy RPC remains available for existing callers.
CREATE OR REPLACE FUNCTION public.record_patient_vitals_complete(
  p_patient_id uuid,
  p_visual_acuity_od text,
  p_visual_acuity_os text,
  p_visual_acuity_ou text,
  p_with_correction boolean,
  p_visual_acuity_od_note text,
  p_visual_acuity_os_note text,
  p_visual_acuity_ou_note text,
  p_gonioscopy_od text,
  p_gonioscopy_os text,
  p_bp_systolic numeric,
  p_bp_diastolic numeric,
  p_pulse numeric,
  p_temperature numeric,
  p_spo2 numeric,
  p_rbs numeric,
  p_recorded_by uuid,
  p_visual_acuity_od_pinhole text,
  p_visual_acuity_os_pinhole text,
  p_visual_acuity_od_glasses text,
  p_visual_acuity_os_glasses text,
  p_visual_acuity_ou_glasses text,
  p_visual_acuity_od_near text,
  p_visual_acuity_os_near text,
  p_visual_acuity_ou_near text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_vitals_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.patients
    WHERE id = p_patient_id
  ) THEN
    RAISE EXCEPTION 'Patient not found';
  END IF;

  INSERT INTO public.vitals (
    patient_id,
    visual_acuity_od,
    visual_acuity_os,
    visual_acuity_ou,
    with_correction,
    visual_acuity_od_note,
    visual_acuity_os_note,
    visual_acuity_ou_note,
    gonioscopy_od,
    gonioscopy_os,
    bp_systolic,
    bp_diastolic,
    pulse,
    temperature,
    spo2,
    rbs,
    recorded_by,
    visual_acuity_od_pinhole,
    visual_acuity_os_pinhole,
    visual_acuity_od_glasses,
    visual_acuity_os_glasses,
    visual_acuity_ou_glasses,
    visual_acuity_od_near,
    visual_acuity_os_near,
    visual_acuity_ou_near
  )
  VALUES (
    p_patient_id,
    NULLIF(BTRIM(p_visual_acuity_od), ''),
    NULLIF(BTRIM(p_visual_acuity_os), ''),
    NULLIF(BTRIM(p_visual_acuity_ou), ''),
    COALESCE(p_with_correction, false),
    NULLIF(BTRIM(p_visual_acuity_od_note), ''),
    NULLIF(BTRIM(p_visual_acuity_os_note), ''),
    NULLIF(BTRIM(p_visual_acuity_ou_note), ''),
    NULLIF(BTRIM(p_gonioscopy_od), ''),
    NULLIF(BTRIM(p_gonioscopy_os), ''),
    p_bp_systolic,
    p_bp_diastolic,
    p_pulse,
    p_temperature,
    p_spo2,
    p_rbs,
    p_recorded_by,
    NULLIF(BTRIM(p_visual_acuity_od_pinhole), ''),
    NULLIF(BTRIM(p_visual_acuity_os_pinhole), ''),
    NULLIF(BTRIM(p_visual_acuity_od_glasses), ''),
    NULLIF(BTRIM(p_visual_acuity_os_glasses), ''),
    NULLIF(BTRIM(p_visual_acuity_ou_glasses), ''),
    NULLIF(BTRIM(p_visual_acuity_od_near), ''),
    NULLIF(BTRIM(p_visual_acuity_os_near), ''),
    NULLIF(BTRIM(p_visual_acuity_ou_near), '')
  )
  RETURNING id INTO v_vitals_id;

  -- Preserve the current queue state rules. A patient only advances
  -- from triage to the doctor queue after the full vitals insert succeeds.
  UPDATE public.patients
  SET status = 'waiting_doctor'
  WHERE id = p_patient_id
    AND status = 'waiting_triage';

  RETURN v_vitals_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_patient_vitals_complete(
  uuid, text, text, text, boolean, text, text, text, text, text,
  numeric, numeric, numeric, numeric, numeric, numeric, uuid,
  text, text, text, text, text, text, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_patient_vitals_complete(
  uuid, text, text, text, boolean, text, text, text, text, text,
  numeric, numeric, numeric, numeric, numeric, numeric, uuid,
  text, text, text, text, text, text, text, text
) TO service_role;
