# Admin page changes — files to merge into your project

## New files
| File | What it does |
|---|---|
| `lib/activity-log.ts` | Shared `logActivity()` / `logSecurityEvent()` helpers — every route below calls into this so Admin can see everything in one place. |
| `app/api/activity-logs/route.ts` | Powers the Audit page's **Operations** tab — real staff/clinical/billing actions. |
| `app/api/security-logs/route.ts` | Powers the Audit page's **Security** tab — real login attempts + derived threat alerts. |
| `app/api/admin/stats/route.ts` | Powers the Dashboard's Total Revenue / Active Patient Encounters cards. |
| `app/api/notifications/route.ts` | Powers the Notifications page — merges persisted broadcasts with live-derived alerts (low stock, unpaid invoices, risky logins). |

## Modified files
| File | What changed |
|---|---|
| `supabase/schema.sql` | Extended `activity_logs` (added `staff_id`, `category`, `details`, `financial_amount`; relaxed the `module` check); added `security_logs` and `notifications` tables. |
| `types/hospital.ts` | Widened `ActivityLog.module` to include `"Admin" \| "Scheduling" \| "Consultation"`. |
| `lib/patient-flow.ts` | `addActivityLog()` now delegates to the shared `logActivity()`, so patient-flow events also show up in the Admin audit feed. |
| `app/api/staff/route.ts` | Logs staff onboarding. |
| `app/api/staff/[id]/route.ts` | Logs suspend/reactivate/permission-update/delete actions. |
| `app/api/patients/route.ts` | Logs new patient registrations. |
| `app/api/inventory/route.ts` | Logs inventory/drug additions. |
| `app/api/appointments/route.ts` | Logs appointment bookings. |
| `app/api/auth/login/route.ts` | Captures real IP address + device (user-agent) and logs every login attempt (success and failure) as a security event. |
| `app/admin/audit/page.tsx` | Both tabs now fetch real data instead of hardcoded mock arrays. |
| `app/admin/page.tsx` | Total Revenue and Active Patient Encounters cards use real data. The other two cards (Average Wait Time, OR Occupancy) have no underlying data source yet, so they're now labeled "Demo data" instead of silently looking real. |
| `app/admin/notifications/page.tsx` | Feed is now real (persisted broadcasts + derived system alerts). Also corrected a misleading warning that claimed emergency alerts "instantly push to all staff interfaces" — they don't yet; that needs a separate real-time delivery feature. |

## To apply
1. Copy each file into the matching path in your project (overwrite existing ones — some of these, like `app/api/inventory/route.ts` and `app/api/patients/route.ts`, are cumulative with earlier rounds, so make sure you're not reverting the Pharmacy changes by applying an older copy).
2. **Run this against your existing Supabase project** (SQL Editor) rather than the full `schema.sql`, since your tables already exist:

```sql
-- Extend activity_logs
alter table activity_logs add column if not exists staff_id uuid references staff(id) on delete set null;
alter table activity_logs add column if not exists category text not null default 'CLINICAL' check (category in ('CLINICAL','BILLING','ADMIN'));
alter table activity_logs add column if not exists details text;
alter table activity_logs add column if not exists financial_amount numeric;
alter table activity_logs drop constraint if exists activity_logs_module_check;

-- New tables
create table if not exists security_logs (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references staff(id) on delete set null,
  username_attempted text not null,
  action text not null,
  ip_address text,
  device text,
  risk_level text not null default 'LOW' check (risk_level in ('LOW','MEDIUM','CRITICAL')),
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  message text not null,
  category text not null,
  target text,
  triggered_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_security_logs_created on security_logs(created_at);
create index if not exists idx_notifications_created on notifications(created_at);

alter table security_logs enable row level security;
alter table notifications enable row level security;
```

3. Restart your dev server / redeploy so the new API routes are picked up.
