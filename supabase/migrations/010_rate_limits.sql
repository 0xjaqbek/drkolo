-- 010: Rate limiting for booking API
-- Tracks booking attempts per phone and per IP for abuse prevention.

create table if not exists booking_rate_limits (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  ip_address text,
  created_at timestamptz not null default now()
);

-- Index for fast lookups
create index idx_rate_limits_phone_created on booking_rate_limits (phone, created_at desc);
create index idx_rate_limits_ip_created on booking_rate_limits (ip_address, created_at desc);

-- Auto-cleanup: delete entries older than 24 hours
-- Run via Supabase pg_cron or manual call
create or replace function cleanup_old_rate_limits()
returns void as $$
  delete from booking_rate_limits where created_at < now() - interval '24 hours';
$$ language sql;

-- To schedule automatic cleanup, enable pg_cron in Supabase Dashboard
-- (Database → Extensions → pg_cron) then run:
-- select cron.schedule('cleanup-rate-limits', '0 * * * *', $$ select cleanup_old_rate_limits() $$);

-- RLS: no direct access for anon
alter table booking_rate_limits enable row level security;
-- No policies = no anon access. Only service_role (Edge Functions) can read/write.
