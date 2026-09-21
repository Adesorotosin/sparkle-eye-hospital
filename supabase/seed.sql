-- Sparkle Eye Specialist Hospital — Seed Data
-- Run this AFTER schema.sql. Safe to re-run (uses ON CONFLICT DO NOTHING).
--
-- Demo login credentials (unchanged from the old mock system, now backed
-- by a real bcrypt hash of "password123" in the database):
--   admin      / password123  -> IT_ADMIN
--   doc_adams  / password123  -> DOCTOR
--   pharmacy   / password123  -> PHARMACIST
--   cashier    / password123  -> CASHIER
--   nurse      / password123  -> NURSE
--   reception  / password123  -> RECEPTIONIST

insert into staff (staff_id, username, password_hash, name, email, role, title, department, assigned_facilities, permissions, is_active)
values
  ('STF-ITADMIN', 'admin', '$2b$10$5uI2p7PcwMCYNkS1uOjZe.EYO0fwhWrmBkRcRDmDU6yutfMBjLtH6', 'Admin User', 'admin@sparkleeye.ng', 'IT_ADMIN', 'IT Administrator', 'IT', 'Main Campus', '{}'::jsonb, true),
  ('VF-2024-0142', 'doc_adams', '$2b$10$5uI2p7PcwMCYNkS1uOjZe.EYO0fwhWrmBkRcRDmDU6yutfMBjLtH6', 'Dr. Adams', 'doc.adams@sparkleeye.ng', 'DOCTOR', 'Senior Ophthalmologist', 'Ophthalmology', 'Main Campus, OR-1, OR-2', '{}'::jsonb, true),
  ('STF-PHARM', 'pharmacy', '$2b$10$5uI2p7PcwMCYNkS1uOjZe.EYO0fwhWrmBkRcRDmDU6yutfMBjLtH6', 'Pharmacy Staff', 'pharmacy@sparkleeye.ng', 'PHARMACIST', 'Lead Pharmacist', 'Pharmacy', 'Main Pharmacy', '{}'::jsonb, true),
  ('STF-CASHIER', 'cashier', '$2b$10$5uI2p7PcwMCYNkS1uOjZe.EYO0fwhWrmBkRcRDmDU6yutfMBjLtH6', 'Cashier Staff', 'cashier@sparkleeye.ng', 'CASHIER', 'Cashier', 'Billing', 'Main Campus', '{}'::jsonb, true),
  ('STF-NURSE', 'nurse', '$2b$10$5uI2p7PcwMCYNkS1uOjZe.EYO0fwhWrmBkRcRDmDU6yutfMBjLtH6', 'Nurse Staff', 'nurse@sparkleeye.ng', 'NURSE', 'Senior Nurse', 'Nursing', 'Main Campus', '{}'::jsonb, true),
  ('STF-RECEPTION', 'reception', '$2b$10$5uI2p7PcwMCYNkS1uOjZe.EYO0fwhWrmBkRcRDmDU6yutfMBjLtH6', 'Reception Staff', 'reception@sparkleeye.ng', 'RECEPTIONIST', 'Front Desk Lead', 'Patient Services', 'Reception, Scheduling', '{}'::jsonb, true),
  ('VF-2024-0098', 'amina_bello', '$2b$10$5uI2p7PcwMCYNkS1uOjZe.EYO0fwhWrmBkRcRDmDU6yutfMBjLtH6', 'Dr. Amina Bello', 'amina.bello@sparkleeye.ng', 'DOCTOR', 'Retina Specialist', 'Ophthalmology', 'Main Campus, Laser Suite', '{}'::jsonb, true),
  ('VF-2023-0312', 'maria_lopez', '$2b$10$5uI2p7PcwMCYNkS1uOjZe.EYO0fwhWrmBkRcRDmDU6yutfMBjLtH6', 'Maria Lopez, RN', 'maria.lopez@sparkleeye.ng', 'NURSE', 'Senior Nurse', 'Surgery', 'OR-1, OR-2, Recovery', '{}'::jsonb, true),
  ('VF-2024-0389', 'sarah_ogundimu', '$2b$10$5uI2p7PcwMCYNkS1uOjZe.EYO0fwhWrmBkRcRDmDU6yutfMBjLtH6', 'Sarah Ogundimu', 'sarah.ogundimu@sparkleeye.ng', 'RECEPTIONIST', 'Front Desk Lead', 'Patient Services', 'Reception, Scheduling', '{}'::jsonb, true)
on conflict (username) do nothing;

-- Demo patient (matches the previous hardcoded mock so existing screenshots/flows still make sense)
insert into patients (patient_code, full_name, coverage_plan, age, gender, phone, allergies, status, last_visit_at)
values ('SPK-30892', 'Mrs. Chidinma Okafor', 'Self-Pay', 42, 'Female', '+234 803 123 4567', 'None', 'in_consultation', now())
on conflict (patient_code) do nothing;

insert into patients (patient_code, full_name, coverage_plan, status, last_visit_at)
values
  ('PAT-2026-090', 'Chukwudi Okeke', 'Private / Out-of-Pocket', 'waiting_triage', now() - interval '2 days'),
  ('PAT-2026-091', 'Folashade Adekunle', 'HMO - Hygeia', 'completed_today', now() - interval '1 day')
on conflict (patient_code) do nothing;

-- Vitals, diagnostics, prescriptions, and invoice for the demo patient
do $$
declare
  demo_patient_id uuid;
  demo_invoice_id uuid;
begin
  select id into demo_patient_id from patients where patient_code = 'SPK-30892';

  insert into vitals (patient_id, visual_acuity_od, visual_acuity_os, iop, primary_complaint)
  values (demo_patient_id, '6/18', '6/12', 22, 'Eye redness and elevated pressure');

  insert into diagnostic_orders (patient_id, name, price, status)
  values
    (demo_patient_id, 'Comprehensive Eye Exam', 15000, 'completed'),
    (demo_patient_id, 'Tonometer (IOP Test)', 8500, 'completed');

  insert into prescriptions (patient_id, drug_name, dosage, quantity, price_per_unit, total_price, status)
  values
    (demo_patient_id, 'Timolol Maleate 0.5%', '1 drop twice daily', 1, 6200, 6200, 'pending_payment'),
    (demo_patient_id, 'Prednisolone Acetate 1%', '1 drop 4x daily', 1, 8500, 8500, 'pending_payment');

  insert into invoices (invoice_no, patient_id, status, subtotal, discount_amount, grand_total)
  values ('INV-2026-4851', demo_patient_id, 'draft', 69700, 0, 69700)
  returning id into demo_invoice_id;

  insert into invoice_items (invoice_id, category, name, quantity, unit_price, total_price)
  values
    (demo_invoice_id, 'consultation', 'Consultation Fee', 1, 25000, 25000),
    (demo_invoice_id, 'diagnostic', 'Comprehensive Eye Exam', 1, 15000, 15000),
    (demo_invoice_id, 'diagnostic', 'Tonometer (IOP Test)', 1, 8500, 8500),
    (demo_invoice_id, 'pharmacy', 'Timolol Maleate 0.5%', 1, 6200, 6200),
    (demo_invoice_id, 'pharmacy', 'Prednisolone Acetate 1%', 1, 8500, 8500),
    (demo_invoice_id, 'consumable', 'Protective Eye Shield', 1, 6500, 6500);

  insert into activity_logs (patient_id, module, action, performed_by)
  values (demo_patient_id, 'Billing', 'Invoice INV-2026-4851 generated.', 'System');
end $$;

-- Inventory (optical stock — matches the previous hardcoded mock)
insert into inventory_items (sku, name, category, domain, stock, reorder_level, price)
values
  ('INV-001', 'Titanium Flex Frame - Matte Black', 'Frames', 'optical', 18, 5, 45000),
  ('INV-002', 'Anti-Reflective Blue Cut Lenses (Pair)', 'Lenses', 'optical', 4, 10, 25000),
  ('INV-003', 'Designer Cat-Eye Frame - Tortoiseshell', 'Frames', 'optical', 12, 4, 38000),
  ('INV-004', 'Daily Disposable Contact Lenses (-2.50)', 'Contacts', 'optical', 30, 15, 18000),
  ('INV-005', 'Multi-Purpose Contact Lens Solution 360ml', 'Accessories', 'optical', 2, 8, 6500)
on conflict (sku) do nothing;

-- Pharmacy drug stock
insert into inventory_items (sku, name, category, domain, stock, reorder_level, price)
values
  ('RX-001', 'Timolol Maleate 0.5% Eye Drops', 'Ophthalmic Drops', 'pharmacy', 24, 10, 6200),
  ('RX-002', 'Prednisolone Acetate 1% Eye Drops', 'Ophthalmic Drops', 'pharmacy', 18, 10, 8500),
  ('RX-003', 'Amoxicillin 500mg (Capsules, x21)', 'Antibiotics', 'pharmacy', 60, 20, 3500),
  ('RX-004', 'Paracetamol 500mg (Tablets, x20)', 'Analgesics', 'pharmacy', 100, 30, 1200),
  ('RX-005', 'Cetirizine 10mg (Tablets, x10)', 'Antihistamines', 'pharmacy', 8, 15, 1800)
on conflict (sku) do nothing;
