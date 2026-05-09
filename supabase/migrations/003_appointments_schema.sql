-- service_working_hours
create table if not exists service_working_hours (
  id uuid primary key default gen_random_uuid(),
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Sunday
  open_time time,
  close_time time,
  is_open boolean not null default true,
  unique(day_of_week)
);

-- Seed default working hours
insert into service_working_hours (day_of_week, open_time, close_time, is_open) values
  (1, '08:00', '17:00', true), -- Monday
  (2, '08:00', '17:00', true), -- Tuesday
  (3, '08:00', '17:00', true), -- Wednesday
  (4, '08:00', '17:00', true), -- Thursday
  (5, '08:00', '17:00', true), -- Friday
  (6, '09:00', '14:00', true), -- Saturday
  (0, null, null, false)       -- Sunday
on conflict (day_of_week) do nothing;

-- service_appointments
create table if not exists service_appointments (
  id uuid primary key default gen_random_uuid(),
  appointment_date date not null,
  arrival_time time not null,
  customer_name text not null,
  customer_phone text not null,
  bike_manufacturer text not null,
  bike_model text not null,
  service_note text,
  status text not null default 'zapytanie'
    check (status in ('zapytanie','potwierdzone','odrzucone','zakonczone')),
  estimated_duration_minutes int,
  technician_note text,
  source text not null default 'online'
    check (source in ('online','manual')),
  created_at timestamptz not null default now()
);

-- service_blocked_times
create table if not exists service_blocked_times (
  id uuid primary key default gen_random_uuid(),
  block_date date not null,
  start_time time not null,
  end_time time not null,
  reason text,
  created_at timestamptz not null default now()
);

-- RLS
alter table service_working_hours enable row level security;
alter table service_appointments enable row level security;
alter table service_blocked_times enable row level security;

-- working hours policies
create policy "anon_select_working_hours" on service_working_hours for select using (true);
create policy "anon_update_working_hours" on service_working_hours for update using (true) with check (true);

-- appointments policies
create policy "anon_select_appointments" on service_appointments for select using (true);
create policy "anon_insert_appointments" on service_appointments for insert with check (true);
create policy "anon_update_appointments" on service_appointments for update using (true) with check (true);

-- blocked times policies
create policy "anon_select_blocked_times" on service_blocked_times for select using (true);
create policy "anon_insert_blocked_times" on service_blocked_times for insert with check (true);
create policy "anon_update_blocked_times" on service_blocked_times for update using (true) with check (true);
create policy "anon_delete_blocked_times" on service_blocked_times for delete using (true);
