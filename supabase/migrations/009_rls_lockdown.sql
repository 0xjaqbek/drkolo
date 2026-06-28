-- 009: Lock down RLS policies
-- Edge Functions now use service_role (bypasses RLS).
-- These policies only affect direct REST API access with the anon key.

-- ============================================================
-- service_working_hours: anon can only SELECT (read schedule)
-- ============================================================
drop policy if exists "anon_select_working_hours" on service_working_hours;
drop policy if exists "anon_update_working_hours" on service_working_hours;

create policy "anon_read_working_hours"
  on service_working_hours for select
  using (true);

-- No INSERT / UPDATE / DELETE for anon on working_hours.

-- ============================================================
-- service_appointments: anon can only INSERT (create booking)
-- No SELECT (protects customer PII), no UPDATE, no DELETE.
-- ============================================================
drop policy if exists "anon_select_appointments" on service_appointments;
drop policy if exists "anon_insert_appointments" on service_appointments;
drop policy if exists "anon_update_appointments" on service_appointments;

create policy "anon_insert_appointments"
  on service_appointments for insert
  with check (
    status = 'zapytanie'
    and source in ('online', 'ai_agent')
  );

-- No SELECT / UPDATE / DELETE for anon on appointments.

-- ============================================================
-- service_blocked_times: anon can only SELECT
-- ============================================================
drop policy if exists "anon_select_blocked_times" on service_blocked_times;
drop policy if exists "anon_insert_blocked_times" on service_blocked_times;
drop policy if exists "anon_update_blocked_times" on service_blocked_times;
drop policy if exists "anon_delete_blocked_times" on service_blocked_times;

create policy "anon_read_blocked_times"
  on service_blocked_times for select
  using (true);

-- No INSERT / UPDATE / DELETE for anon on blocked_times.
