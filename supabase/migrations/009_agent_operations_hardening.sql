alter table public.service_appointments
  add column if not exists customer_phone_normalized text,
  add column if not exists lookup_token_hash text;

update public.service_appointments
set customer_phone_normalized = pg_catalog.regexp_replace(
  customer_phone,
  '[^0-9]',
  '',
  'g'
)
where customer_phone_normalized is null;

do $migration$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.service_appointments'::pg_catalog.regclass
      and conname = 'service_appointments_lookup_token_hash_format'
  ) then
    alter table public.service_appointments
      add constraint service_appointments_lookup_token_hash_format
      check (
        lookup_token_hash is null
        or lookup_token_hash ~ '^[a-f0-9]{64}$'
      );
  end if;
end
$migration$;

do $migration$
declare
  duplicate_group_count bigint;
  duplicate_examples text;
begin
  select pg_catalog.count(*)
  into duplicate_group_count
  from (
    select 1
    from public.service_appointments
    where status <> 'odrzucone'
    group by appointment_date, arrival_time
    having pg_catalog.count(*) > 1
  ) as duplicate_groups;

  if duplicate_group_count > 0 then
    select pg_catalog.string_agg(
      pg_catalog.format(
        '%s at %s (%s active rows)',
        duplicate_group.appointment_date,
        duplicate_group.arrival_time,
        duplicate_group.row_count
      ),
      ', ' order by duplicate_group.appointment_date, duplicate_group.arrival_time
    )
    into duplicate_examples
    from (
      select
        appointment_date,
        arrival_time,
        pg_catalog.count(*) as row_count
      from public.service_appointments
      where status <> 'odrzucone'
      group by appointment_date, arrival_time
      having pg_catalog.count(*) > 1
      order by appointment_date, arrival_time
      limit 10
    ) as duplicate_group;

    raise exception
      'Cannot create service_appointments_active_slot_unique: found % duplicate active slot group(s). Examples: %',
      duplicate_group_count,
      duplicate_examples
      using hint =
        'Resolve duplicate non-rejected appointments before applying this migration.';
  end if;
end
$migration$;

create unique index if not exists service_appointments_active_slot_unique
  on public.service_appointments (appointment_date, arrival_time)
  where status <> 'odrzucone';

insert into public.service_working_hours (
  day_of_week,
  open_time,
  close_time,
  is_open
)
values
  (0, null, null, false),
  (1, '10:00'::time, '19:00'::time, true),
  (2, '10:00'::time, '19:00'::time, true),
  (3, '10:00'::time, '19:00'::time, true),
  (4, '10:00'::time, '19:00'::time, true),
  (5, '10:00'::time, '19:00'::time, true),
  (6, '10:00'::time, '16:00'::time, true)
on conflict (day_of_week) do update
set open_time = excluded.open_time,
    close_time = excluded.close_time,
    is_open = excluded.is_open;

do $migration$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.service_working_hours'::pg_catalog.regclass
      and conname = 'service_working_hours_open_times_required'
  ) then
    alter table public.service_working_hours
      add constraint service_working_hours_open_times_required
      check (
        not is_open
        or (open_time is not null and close_time is not null)
      )
      not valid;
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.service_working_hours'::pg_catalog.regclass
      and conname = 'service_working_hours_time_order'
  ) then
    alter table public.service_working_hours
      add constraint service_working_hours_time_order
      check (
        open_time is null
        or close_time is null
        or open_time < close_time
      )
      not valid;
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.service_working_hours'::pg_catalog.regclass
      and conname = 'service_working_hours_half_hour_alignment'
  ) then
    alter table public.service_working_hours
      add constraint service_working_hours_half_hour_alignment
      check (
        (
          open_time is null
          or (
            extract(minute from open_time) in (0, 30)
            and extract(second from open_time) = 0
          )
        )
        and (
          close_time is null
          or (
            extract(minute from close_time) in (0, 30)
            and extract(second from close_time) = 0
          )
        )
      )
      not valid;
  end if;
end
$migration$;

alter table public.service_working_hours
  validate constraint service_working_hours_open_times_required;
alter table public.service_working_hours
  validate constraint service_working_hours_time_order;
alter table public.service_working_hours
  validate constraint service_working_hours_half_hour_alignment;

create or replace function public.get_public_availability(p_date date)
returns table (
  requested_date date,
  open_time time without time zone,
  close_time time without time zone,
  slots text[]
)
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select
    p_date as requested_date,
    working_hours.open_time,
    working_hours.close_time,
    case
      when working_hours.is_open
        and working_hours.open_time is not null
        and working_hours.close_time is not null
        and working_hours.close_time > working_hours.open_time
      then coalesce(
        (
          select pg_catalog.array_agg(
            pg_catalog.to_char(candidate.slot_start, 'HH24:MI')
            order by candidate.slot_start
          )
          from pg_catalog.generate_series(
            p_date + working_hours.open_time,
            p_date + working_hours.close_time - interval '30 minutes',
            interval '30 minutes'
          ) as candidate(slot_start)
          where not exists (
            select 1
            from public.service_appointments as appointment
            where appointment.appointment_date = p_date
              and appointment.arrival_time = candidate.slot_start::time
              and appointment.status <> 'odrzucone'
          )
            and not exists (
              select 1
              from public.service_blocked_times as blocked_time
              where blocked_time.block_date = p_date
                and candidate.slot_start
                  < blocked_time.block_date + blocked_time.end_time
                and candidate.slot_start + interval '30 minutes'
                  > blocked_time.block_date + blocked_time.start_time
            )
        ),
        array[]::text[]
      )
      else array[]::text[]
    end as slots
  from (select 1) as singleton
  left join public.service_working_hours as working_hours
    on working_hours.day_of_week = extract(dow from p_date)::integer;
$function$;

create or replace function public.create_public_appointment(
  p_appointment_date date,
  p_arrival_time time without time zone,
  p_customer_name text,
  p_customer_phone text,
  p_customer_phone_normalized text,
  p_bike_manufacturer text,
  p_bike_model text,
  p_service_note text,
  p_lookup_token_hash text
)
returns table (
  id uuid,
  status text
)
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_open_time time without time zone;
  v_close_time time without time zone;
  v_is_open boolean;
  v_slot_start timestamp without time zone;
  v_slot_end timestamp without time zone;
  v_created_id uuid;
  v_created_status text;
  v_constraint_name text;
begin
  select
    working_hours.open_time,
    working_hours.close_time,
    working_hours.is_open
  into
    v_open_time,
    v_close_time,
    v_is_open
  from public.service_working_hours as working_hours
  where working_hours.day_of_week =
    extract(dow from p_appointment_date)::integer;

  if not found
    or not coalesce(v_is_open, false)
    or v_open_time is null
    or v_close_time is null
    or v_close_time <= v_open_time
  then
    raise exception using
      errcode = 'DRK01',
      message = 'day closed';
  end if;

  if p_arrival_time is null
    or extract(second from p_arrival_time) <> 0
    or mod(extract(minute from p_arrival_time)::integer, 30) <> 0
  then
    raise exception using
      errcode = 'DRK02',
      message = 'invalid slot';
  end if;

  v_slot_start := p_appointment_date + p_arrival_time;
  v_slot_end := v_slot_start + interval '30 minutes';

  if v_slot_start < p_appointment_date + v_open_time
    or v_slot_end > p_appointment_date + v_close_time
  then
    raise exception using
      errcode = 'DRK02',
      message = 'invalid slot';
  end if;

  if exists (
    select 1
    from public.service_blocked_times as blocked_time
    where blocked_time.block_date = p_appointment_date
      and v_slot_start < blocked_time.block_date + blocked_time.end_time
      and v_slot_end > blocked_time.block_date + blocked_time.start_time
  ) then
    raise exception using
      errcode = 'DRK02',
      message = 'slot blocked';
  end if;

  if exists (
    select 1
    from public.service_appointments as appointment
    where appointment.appointment_date = p_appointment_date
      and appointment.arrival_time = p_arrival_time
      and appointment.status <> 'odrzucone'
  ) then
    raise exception using
      errcode = 'DRK03',
      message = 'slot taken';
  end if;

  begin
    insert into public.service_appointments as appointment (
      appointment_date,
      arrival_time,
      customer_name,
      customer_phone,
      customer_phone_normalized,
      bike_manufacturer,
      bike_model,
      service_note,
      lookup_token_hash,
      status,
      source
    )
    values (
      p_appointment_date,
      p_arrival_time,
      p_customer_name,
      p_customer_phone,
      p_customer_phone_normalized,
      p_bike_manufacturer,
      p_bike_model,
      p_service_note,
      p_lookup_token_hash,
      'zapytanie',
      'ai_agent'
    )
    returning appointment.id, appointment.status
    into v_created_id, v_created_status;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint_name = constraint_name;

      if v_constraint_name = 'service_appointments_active_slot_unique' then
        raise exception using
          errcode = 'DRK03',
          message = 'slot taken';
      end if;

      raise;
  end;

  return query
  select v_created_id, v_created_status;
end
$function$;

create or replace function public.get_public_appointment(
  p_phone_normalized text,
  p_lookup_token_hash text
)
returns table (
  id uuid,
  appointment_date date,
  arrival_time time without time zone,
  status text,
  bike_manufacturer text,
  bike_model text,
  service_note text,
  created_at timestamp with time zone
)
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select
    appointment.id,
    appointment.appointment_date,
    appointment.arrival_time,
    appointment.status,
    appointment.bike_manufacturer,
    appointment.bike_model,
    appointment.service_note,
    appointment.created_at
  from public.service_appointments as appointment
  where appointment.customer_phone_normalized = p_phone_normalized
    and appointment.lookup_token_hash = p_lookup_token_hash
  order by
    appointment.appointment_date desc,
    appointment.arrival_time desc,
    appointment.created_at desc
  limit 1;
$function$;

alter table public.service_appointments enable row level security;
alter table public.service_working_hours enable row level security;
alter table public.service_blocked_times enable row level security;

drop policy if exists "anon_select_appointments"
  on public.service_appointments;
drop policy if exists "anon_insert_appointments"
  on public.service_appointments;
drop policy if exists "anon_update_appointments"
  on public.service_appointments;

drop policy if exists "anon_select_working_hours"
  on public.service_working_hours;
drop policy if exists "anon_update_working_hours"
  on public.service_working_hours;

drop policy if exists "anon_select_blocked_times"
  on public.service_blocked_times;
drop policy if exists "anon_insert_blocked_times"
  on public.service_blocked_times;
drop policy if exists "anon_update_blocked_times"
  on public.service_blocked_times;
drop policy if exists "anon_delete_blocked_times"
  on public.service_blocked_times;

revoke all privileges on table public.service_appointments
  from public, anon, authenticated;
revoke all privileges on table public.service_working_hours
  from public, anon, authenticated;
revoke all privileges on table public.service_blocked_times
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.service_appointments
  to service_role;
grant select, insert, update, delete
  on table public.service_working_hours
  to service_role;
grant select, insert, update, delete
  on table public.service_blocked_times
  to service_role;

revoke execute on function public.get_public_availability(date) from public;
revoke execute on function public.get_public_availability(date) from anon;
revoke execute on function public.get_public_availability(date) from authenticated;
grant execute on function public.get_public_availability(date) to service_role;

revoke execute on function public.create_public_appointment(
  date,
  time without time zone,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public;
revoke execute on function public.create_public_appointment(
  date,
  time without time zone,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from anon;
revoke execute on function public.create_public_appointment(
  date,
  time without time zone,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from authenticated;
grant execute on function public.create_public_appointment(
  date,
  time without time zone,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;

revoke execute on function public.get_public_appointment(text, text) from public;
revoke execute on function public.get_public_appointment(text, text) from anon;
revoke execute on function public.get_public_appointment(text, text)
  from authenticated;
grant execute on function public.get_public_appointment(text, text)
  to service_role;
