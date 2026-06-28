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
  overlap_pair_count bigint;
  overlap_examples text;
begin
  select pg_catalog.count(*)
  into overlap_pair_count
  from public.service_appointments as existing
  join public.service_appointments as candidate
    on existing.appointment_date = candidate.appointment_date
    and existing.id < candidate.id
  where existing.status <> 'odrzucone'
    and candidate.status <> 'odrzucone'
    and existing.appointment_date + existing.arrival_time
      < candidate.appointment_date + candidate.arrival_time
        + pg_catalog.make_interval(
          mins => pg_catalog.coalesce(
            candidate.estimated_duration_minutes,
            60
          )
        )
    and existing.appointment_date + existing.arrival_time
        + pg_catalog.make_interval(
          mins => pg_catalog.coalesce(
            existing.estimated_duration_minutes,
            60
          )
        )
      > candidate.appointment_date + candidate.arrival_time;

  if overlap_pair_count > 0 then
    select pg_catalog.string_agg(
      pg_catalog.format(
        '%s: %s (%s min) overlaps %s (%s min)',
        overlap_pair.appointment_date,
        overlap_pair.existing_time,
        overlap_pair.existing_duration,
        overlap_pair.candidate_time,
        overlap_pair.candidate_duration
      ),
      ', ' order by
        overlap_pair.appointment_date,
        overlap_pair.existing_time,
        overlap_pair.candidate_time
    )
    into overlap_examples
    from (
      select
        existing.appointment_date,
        existing.arrival_time as existing_time,
        pg_catalog.coalesce(
          existing.estimated_duration_minutes,
          60
        ) as existing_duration,
        candidate.arrival_time as candidate_time,
        pg_catalog.coalesce(
          candidate.estimated_duration_minutes,
          60
        ) as candidate_duration
      from public.service_appointments as existing
      join public.service_appointments as candidate
        on existing.appointment_date = candidate.appointment_date
        and existing.id < candidate.id
      where existing.status <> 'odrzucone'
        and candidate.status <> 'odrzucone'
        and existing.appointment_date + existing.arrival_time
          < candidate.appointment_date + candidate.arrival_time
            + pg_catalog.make_interval(
              mins => pg_catalog.coalesce(
                candidate.estimated_duration_minutes,
                60
              )
            )
        and existing.appointment_date + existing.arrival_time
            + pg_catalog.make_interval(
              mins => pg_catalog.coalesce(
                existing.estimated_duration_minutes,
                60
              )
            )
          > candidate.appointment_date + candidate.arrival_time
      order by
        existing.appointment_date,
        existing.arrival_time,
        candidate.arrival_time
      limit 10
    ) as overlap_pair;

    raise exception
      'Cannot create service_appointments_active_slot_unique: found % overlapping active appointment pair(s). Examples: %',
      overlap_pair_count,
      overlap_examples
      using hint =
        'Resolve overlapping non-rejected appointments before applying this migration.';
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
            p_date + working_hours.close_time - interval '60 minutes',
            interval '30 minutes'
          ) as candidate(slot_start)
          where not exists (
            select 1
            from public.service_appointments as appointment
            where appointment.appointment_date = p_date
              and appointment.status <> 'odrzucone'
              and candidate.slot_start
                < appointment.appointment_date + appointment.arrival_time
                  + pg_catalog.make_interval(
                    mins => pg_catalog.coalesce(
                      appointment.estimated_duration_minutes,
                      60
                    )
                  )
              and candidate.slot_start + interval '60 minutes'
                > appointment.appointment_date + appointment.arrival_time
          )
            and not exists (
              select 1
              from public.service_blocked_times as blocked_time
              where blocked_time.block_date = p_date
                and candidate.slot_start
                  < blocked_time.block_date + blocked_time.end_time
                and candidate.slot_start + interval '60 minutes'
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
  if p_appointment_date is null then
    raise exception using
      errcode = 'DRK02',
      message = 'invalid slot';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    1146243923,
    p_appointment_date - date '2000-01-01'
  );

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
  v_slot_end := v_slot_start + interval '60 minutes';

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
      and appointment.status <> 'odrzucone'
      and v_slot_start
        < appointment.appointment_date + appointment.arrival_time
          + pg_catalog.make_interval(
            mins => pg_catalog.coalesce(
              appointment.estimated_duration_minutes,
              60
            )
          )
      and v_slot_end
        > appointment.appointment_date + appointment.arrival_time
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
      estimated_duration_minutes,
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
      60,
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

create or replace function public.create_admin_appointment(
  p_appointment_date date,
  p_arrival_time time without time zone,
  p_customer_name text,
  p_customer_phone text,
  p_customer_phone_normalized text,
  p_bike_manufacturer text,
  p_bike_model text,
  p_service_note text,
  p_estimated_duration_minutes integer
)
returns table (
  id uuid,
  appointment_date date,
  arrival_time time without time zone,
  customer_name text,
  customer_phone text,
  bike_manufacturer text,
  bike_model text,
  service_note text,
  status text,
  estimated_duration_minutes integer,
  technician_note text,
  source text,
  created_at timestamp with time zone
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
  v_constraint_name text;
begin
  if p_appointment_date is null
    or p_estimated_duration_minutes is null
    or p_estimated_duration_minutes < 1
    or p_estimated_duration_minutes > 1440
  then
    raise exception using
      errcode = 'DRK02',
      message = 'invalid slot';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    1146243923,
    p_appointment_date - date '2000-01-01'
  );

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
    or not pg_catalog.coalesce(v_is_open, false)
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
  v_slot_end := v_slot_start + pg_catalog.make_interval(
    mins => p_estimated_duration_minutes
  );

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
      and appointment.status <> 'odrzucone'
      and v_slot_start
        < appointment.appointment_date + appointment.arrival_time
          + pg_catalog.make_interval(
            mins => pg_catalog.coalesce(
              appointment.estimated_duration_minutes,
              60
            )
          )
      and v_slot_end
        > appointment.appointment_date + appointment.arrival_time
  ) then
    raise exception using
      errcode = 'DRK03',
      message = 'slot taken';
  end if;

  begin
    return query
    insert into public.service_appointments as appointment (
      appointment_date,
      arrival_time,
      customer_name,
      customer_phone,
      customer_phone_normalized,
      bike_manufacturer,
      bike_model,
      service_note,
      status,
      estimated_duration_minutes,
      technician_note,
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
      'potwierdzone',
      p_estimated_duration_minutes,
      null,
      'manual'
    )
    returning
      appointment.id,
      appointment.appointment_date,
      appointment.arrival_time,
      appointment.customer_name,
      appointment.customer_phone,
      appointment.bike_manufacturer,
      appointment.bike_model,
      appointment.service_note,
      appointment.status,
      appointment.estimated_duration_minutes,
      appointment.technician_note,
      appointment.source,
      appointment.created_at;
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
end
$function$;

create or replace function public.update_admin_appointment(
  p_id uuid,
  p_apply_status boolean default false,
  p_status text default null,
  p_apply_appointment_date boolean default false,
  p_appointment_date date default null,
  p_apply_arrival_time boolean default false,
  p_arrival_time time without time zone default null,
  p_apply_estimated_duration_minutes boolean default false,
  p_estimated_duration_minutes integer default null,
  p_apply_technician_note boolean default false,
  p_technician_note text default null
)
returns table (
  id uuid,
  appointment_date date,
  arrival_time time without time zone,
  customer_name text,
  customer_phone text,
  bike_manufacturer text,
  bike_model text,
  service_note text,
  status text,
  estimated_duration_minutes integer,
  technician_note text,
  source text,
  created_at timestamp with time zone
)
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_existing public.service_appointments%rowtype;
  v_target_date date;
  v_target_time time without time zone;
  v_target_status text;
  v_target_duration integer;
  v_effective_duration integer;
  v_scheduling_change boolean;
  v_open_time time without time zone;
  v_close_time time without time zone;
  v_is_open boolean;
  v_slot_start timestamp without time zone;
  v_slot_end timestamp without time zone;
  v_constraint_name text;
begin
  select appointment.*
  into v_existing
  from public.service_appointments as appointment
  where appointment.id = p_id
  for update;

  if not found then
    return;
  end if;

  v_target_date := case
    when p_apply_appointment_date then p_appointment_date
    else v_existing.appointment_date
  end;
  v_target_time := case
    when p_apply_arrival_time then p_arrival_time
    else v_existing.arrival_time
  end;
  v_target_status := case
    when p_apply_status then p_status
    else v_existing.status
  end;
  v_target_duration := case
    when p_apply_estimated_duration_minutes
      then p_estimated_duration_minutes
    else v_existing.estimated_duration_minutes
  end;
  v_scheduling_change :=
    (
      p_apply_status
      and p_status is distinct from v_existing.status
    )
    or (
      p_apply_appointment_date
      and p_appointment_date is distinct from v_existing.appointment_date
    )
    or (
      p_apply_arrival_time
      and p_arrival_time is distinct from v_existing.arrival_time
    )
    or (
      p_apply_estimated_duration_minutes
      and p_estimated_duration_minutes
        is distinct from v_existing.estimated_duration_minutes
    );

  if pg_catalog.coalesce(v_scheduling_change, false) then
    if v_target_status is null
      or v_target_status not in (
        'zapytanie',
        'potwierdzone',
        'odrzucone',
        'zakonczone'
      )
    then
      raise exception using
        errcode = 'DRK02',
        message = 'invalid status';
    end if;

    if v_target_duration is not null
      and (v_target_duration < 1 or v_target_duration > 1440)
    then
      raise exception using
        errcode = 'DRK02',
        message = 'invalid slot';
    end if;
    v_effective_duration := pg_catalog.coalesce(v_target_duration, 60);

    if v_target_date is null then
      raise exception using
        errcode = 'DRK02',
        message = 'invalid slot';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(
      1146243923,
      v_target_date - date '2000-01-01'
    );

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
      extract(dow from v_target_date)::integer;

    if not found
      or not pg_catalog.coalesce(v_is_open, false)
      or v_open_time is null
      or v_close_time is null
      or v_close_time <= v_open_time
    then
      raise exception using
        errcode = 'DRK01',
        message = 'day closed';
    end if;

    if v_target_time is null
      or extract(second from v_target_time) <> 0
      or mod(extract(minute from v_target_time)::integer, 30) <> 0
    then
      raise exception using
        errcode = 'DRK02',
        message = 'invalid slot';
    end if;

    v_slot_start := v_target_date + v_target_time;
    v_slot_end := v_slot_start + pg_catalog.make_interval(
      mins => v_effective_duration
    );

    if v_slot_start < v_target_date + v_open_time
      or v_slot_end > v_target_date + v_close_time
    then
      raise exception using
        errcode = 'DRK02',
        message = 'invalid slot';
    end if;

    if exists (
      select 1
      from public.service_blocked_times as blocked_time
      where blocked_time.block_date = v_target_date
        and v_slot_start < blocked_time.block_date + blocked_time.end_time
        and v_slot_end > blocked_time.block_date + blocked_time.start_time
    ) then
      raise exception using
        errcode = 'DRK02',
        message = 'slot blocked';
    end if;

    if v_target_status <> 'odrzucone'
      and exists (
        select 1
        from public.service_appointments as appointment
        where appointment.id <> p_id
          and appointment.appointment_date = v_target_date
          and appointment.status <> 'odrzucone'
          and v_slot_start
            < appointment.appointment_date + appointment.arrival_time
              + pg_catalog.make_interval(
                mins => pg_catalog.coalesce(
                  appointment.estimated_duration_minutes,
                  60
                )
              )
          and v_slot_end
            > appointment.appointment_date + appointment.arrival_time
      )
    then
      raise exception using
        errcode = 'DRK03',
        message = 'slot taken';
    end if;
  end if;

  begin
    update public.service_appointments as appointment
    set
      status = case
        when p_apply_status then p_status
        else appointment.status
      end,
      appointment_date = case
        when p_apply_appointment_date then p_appointment_date
        else appointment.appointment_date
      end,
      arrival_time = case
        when p_apply_arrival_time then p_arrival_time
        else appointment.arrival_time
      end,
      estimated_duration_minutes = case
        when p_apply_estimated_duration_minutes
          then p_estimated_duration_minutes
        else appointment.estimated_duration_minutes
      end,
      technician_note = case
        when p_apply_technician_note then p_technician_note
        else appointment.technician_note
      end
    where appointment.id = p_id;
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
  select
    appointment.id,
    appointment.appointment_date,
    appointment.arrival_time,
    appointment.customer_name,
    appointment.customer_phone,
    appointment.bike_manufacturer,
    appointment.bike_model,
    appointment.service_note,
    appointment.status,
    appointment.estimated_duration_minutes,
    appointment.technician_note,
    appointment.source,
    appointment.created_at
  from public.service_appointments as appointment
  where appointment.id = p_id;
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

revoke execute on function public.create_admin_appointment(
  date,
  time without time zone,
  text,
  text,
  text,
  text,
  text,
  text,
  integer
) from public, anon, authenticated;
grant execute on function public.create_admin_appointment(
  date,
  time without time zone,
  text,
  text,
  text,
  text,
  text,
  text,
  integer
) to service_role;

revoke execute on function public.update_admin_appointment(
  uuid,
  boolean,
  text,
  boolean,
  date,
  boolean,
  time without time zone,
  boolean,
  integer,
  boolean,
  text
) from public, anon, authenticated;
grant execute on function public.update_admin_appointment(
  uuid,
  boolean,
  text,
  boolean,
  date,
  boolean,
  time without time zone,
  boolean,
  integer,
  boolean,
  text
) to service_role;

revoke execute on function public.get_public_appointment(text, text) from public;
revoke execute on function public.get_public_appointment(text, text) from anon;
revoke execute on function public.get_public_appointment(text, text)
  from authenticated;
grant execute on function public.get_public_appointment(text, text)
  to service_role;
