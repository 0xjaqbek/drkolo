alter table service_appointments
  drop constraint service_appointments_source_check;
alter table service_appointments
  add constraint service_appointments_source_check
  check (source in ('online', 'manual', 'ai_agent'));
