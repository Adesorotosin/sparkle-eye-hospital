# Sparkle Eye Hospital — Pre-handover audit

## Guardrails

- Treat the configured Supabase project `zsadlvknkielyqfewpvm` as production/live data.
- Do not create, update, delete, or backfill real patient or clinical records during audit.
- Do not apply migrations to the live database as part of the audit.
- All remediation goes through feature branches and pull requests; no merge or production deployment without owner approval.
- A Vercel preview may still use production Supabase credentials. Confirm the preview's environment variables before any write test.
- Do not mark a workflow passed based on static source review alone.

## Initial verified findings

1. `next.config.ts` sets `typescript.ignoreBuildErrors: true`. Production builds can pass despite TypeScript errors.
2. `package.json` has only `dev`, `build`, and `start` scripts. There are no repository scripts for lint, typecheck, or automated tests.
3. `app/triage/page.tsx` initializes OD/OS/OU visual acuity to `6/6` and general vitals to plausible values (BP 128/82, pulse 76, temperature 36.8, SpO2 98). These values can be saved without being measured.
4. `app/api/patients/[code]/vitals/route.ts` calls `record_patient_vitals` to insert core vitals and advance the queue, then updates additional visual-acuity fields in a separate database request. If the second request fails, the API reports failure after the first operation has committed.
5. `app/receptionist/page.tsx` and other screens use UTC-based `new Date().toISOString().slice(0, 10)` for local date defaults; this can be one day behind in Lagos during the first hour after midnight.
6. `lib/patient-flow.ts` generates invoice numbers using a random four-digit suffix. Verify uniqueness constraints and collision recovery; this pattern can collide.
7. `lib/patient-flow.ts` includes a `getOrCreatePatientByCode` helper that creates a minimal patient from a code. Audit every call site to ensure clinical workflows cannot accidentally create incomplete patients.
8. The live database currently reports 19 patient rows, 16 with a null/blank registration number, and no duplicate internal patient codes. These appear to include legacy records. Do not backfill them automatically; decide the historical-data policy with the owner.
9. The live database's registration-number trigger uses a zero-padded sequence (for example `001/26`), while the requested format is unpadded (for example `1/26`). Correct future numbering only through a reviewed migration; do not rewrite existing records automatically.
10. Supabase's advisor reports 29 tables with RLS enabled and no policies. A separate grants query returned no direct grants to `anon`/`authenticated`/PUBLIC for the checked public tables, and the app uses a server secret key. Treat this as a server-only access-model review, not as proof of an exploitable vulnerability; verify the full grants/role model before changing policies.
11. Supabase's performance advisor reports 31 foreign keys without covering indexes. Review query patterns and migration impact before adding indexes.
12. Open PRs include draft work for shared inventory recovery and triage-to-doctor handoff. Review these against `main` and the live schema before considering them; do not merge diverged branches wholesale.

## Remediation tracks

### A. Build quality and release gates
- Remove `ignoreBuildErrors` only after running a real typecheck and resolving errors.
- Add explicit lint/typecheck/test scripts and CI checks.
- Confirm Vercel preview builds and required environment variables without printing secrets.

### B. Registration and identity
- Make internal patient-code and invoice-number generation collision-safe.
- Align future registration-number formatting with the agreed `1/26` style.
- Define handling for legacy rows without registration numbers; no silent data backfill.
- Test duplicate submissions, validation, dates, and failure recovery.

### C. Nursing / triage
- Start clinical measurement fields blank; require explicit entry for mandatory visual-acuity values and validate numeric inputs.
- Make core vitals and all additional visual-acuity fields save atomically with the queue transition.
- Test retries, concurrent submissions, invalid ranges, and correct doctor-queue visibility.

### D. Clinical workflow and permissions
- Verify reception → triage → doctor → consultation → referrals and clinical handoffs.
- Verify diagnostic and laboratory orders/results, sample lifecycle, result verification, and return to doctor.
- Verify in-house and visiting optometry workflows, visit type, patient linkage, and encounter history.
- Verify role permissions in both UI and server actions/API routes.

### E. Billing, pharmacy, inventory
- Verify invoice item linkage, totals, discounts/VAT, payment idempotency, and over/underpayment handling.
- Verify unpaid items cannot be dispensed/performed and payment cannot unlock unrelated orders.
- Verify stock decrement and movement ledger are atomic, exact-once, and protected against concurrent dispensing.
- Verify deferred prescriptions, returns/adjustments if supported, and cashier reporting.

### F. Security, reliability, and UX
- Review session expiry/logout, middleware vs server authorization, route access, error handling, audit logs, and sensitive data exposure.
- Review RLS/grants and SECURITY DEFINER functions without broadening direct database access.
- Fix Lagos-local date handling, loading/empty/error states, duplicate-click prevention, keyboard/mobile usability, and console errors.
- Review database indexes against actual query filters/orderings.

## Test evidence required before handoff

For each workflow, record: role used, preconditions, steps, expected result, actual result, persistence verified, authorization verified, failure/retry result, and evidence. Keep production read-only until an isolated test database or explicitly safe test setup is confirmed.

## Initial remediation now in the audit branch

- Triage no longer pre-populates visual acuity or general vital signs with plausible measurements; distance visual acuity now has an explicit blank prompt.
- Added an additive RPC and migration to save all triage measurements and queue handoff in one database transaction; added a rollback-only PostgreSQL integration test.
- Reception's date default now uses the `Africa/Lagos` calendar date.
- Patient-code generation retries on a patient-code unique-constraint collision without masking unrelated database errors.
- Added `lint` and `typecheck` npm scripts and extended the existing release-safeguards workflow to run lint/typecheck plus the triage atomicity test.

## Current status

- Repository and schema review: in progress.
- Initial fixes are committed to `audit/pre-handover-remediation`; CI/preview results are pending.
- Live database: read-only inspection only; no test patient or clinical write performed.
- The new migration has not been applied to Supabase.
- Browser-based Vercel preview journey: not yet executed.
- No merge or production deployment authorized by this document.
