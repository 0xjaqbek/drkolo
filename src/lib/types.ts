export type ZlecenieStatus = 'oczekuje' | 'w_trakcie' | 'gotowe';

export interface Zlecenie {
  id: string;
  hash: string;
  bike_model: string;
  customer_phone: string;
  status: ZlecenieStatus;
  created_at: string;
}

export interface ZlecenieItem {
  id: string;
  zlecenie_id: string;
  label: string;
  is_done: boolean;
  done_at: string | null;
  sort_order: number;
}

export interface UpdatePhoto {
  id: string;
  update_id: string;
  storage_path: string;
  created_at: string;
}

export interface ZlecenieUpdate {
  id: string;
  zlecenie_id: string;
  item_id: string | null;
  note: string | null;
  created_at: string;
  update_photos: UpdatePhoto[];
}

export interface CatalogItem {
  id: string;
  category: string;
  label: string;
  is_package: boolean;
  parent_id: string | null;
  sort_order: number;
  children?: CatalogItem[];
}

export type AppointmentStatus = 'zapytanie' | 'potwierdzone' | 'odrzucone' | 'zakonczone';
export type AppointmentSource = 'online' | 'manual' | 'ai_agent';

export interface ServiceAppointment {
  id: string;
  appointment_date: string;
  arrival_time: string;
  customer_name: string;
  customer_phone: string;
  bike_manufacturer: string;
  bike_model: string;
  service_note: string | null;
  status: AppointmentStatus;
  estimated_duration_minutes: number | null;
  technician_note: string | null;
  source: AppointmentSource;
  created_at: string;
}

export interface WorkingHours {
  id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_open: boolean;
}

export interface BlockedTime {
  id: string;
  block_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  created_at: string;
}

export interface AvailabilityResponse {
  date: string;
  timezone: string;
  open: string | null;
  close: string | null;
  slots: string[];
}

export interface CreateAppointmentInquiryInput {
  date: string;
  time: string;
  customer_name: string;
  customer_phone: string;
  bike_manufacturer: string;
  bike_model: string;
  service_note: string | null;
}

export interface CreateAppointmentInquiryResponse {
  id: string;
  status: AppointmentStatus;
  lookup_token: string;
  message: string;
}

export interface AppointmentStatusResponse {
  id: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  bike_manufacturer: string;
  bike_model: string;
  service_note: string | null;
  created_at: string;
}

export interface WorkingHoursUpdate {
  open_time: string | null;
  close_time: string | null;
  is_open: boolean;
}

export interface ManualAppointmentInput {
  appointment_date: string;
  arrival_time: string;
  customer_name: string;
  customer_phone: string;
  bike_manufacturer: string;
  bike_model: string;
  service_note: string | null;
  estimated_duration_minutes: number;
}

export interface AppointmentUpdate {
  status?: AppointmentStatus;
  estimated_duration_minutes?: number | null;
  technician_note?: string | null;
}

export interface BlockedTimeInput {
  block_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
}

export interface DeleteBlockedTimeResponse {
  id: string;
  deleted: true;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export interface PageView {
  id: string;
  path: string;
  referrer: string | null;
  session_id: string;
  user_agent: string | null;
  created_at: string;
}

export type SurveyAnswers = Record<string, Record<string, string>>;

export interface SurveyResponse {
  id: string;
  answers: SurveyAnswers;
  submitted_at: string;
}
