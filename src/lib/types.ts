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

export interface BrowserApiConfig {
  functionsBase: string;
  anonKey: string;
}

export function getBrowserApiConfig(): BrowserApiConfig {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!rawUrl || !anonKey) {
    throw new ApiClientError(
      0,
      'CONFIG_ERROR',
      'Invalid browser API configuration',
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ApiClientError(
      0,
      'CONFIG_ERROR',
      'Invalid browser API configuration',
    );
  }

  const isSupabaseHost = url.hostname === 'supabase.co' ||
    url.hostname.endsWith('.supabase.co');
  if (
    url.protocol !== 'https:' ||
    !isSupabaseHost ||
    url.username ||
    url.password
  ) {
    throw new ApiClientError(
      0,
      'CONFIG_ERROR',
      'Invalid browser API configuration',
    );
  }

  return {
    functionsBase: `${url.origin}/functions/v1`,
    anonKey,
  };
}

function fallbackMessage(response: Response): string {
  const suffix = response.statusText ? ` ${response.statusText}` : '';
  return `Request failed with status ${response.status}${suffix}`;
}

export async function parseApiResponse<T>(
  response: Response,
  isValid?: (payload: unknown) => boolean,
): Promise<T> {
  const text = await response.text();
  let payload: unknown;
  let parsed = false;

  if (text) {
    try {
      payload = JSON.parse(text);
      parsed = true;
    } catch {
      payload = undefined;
    }
  }

  if (!response.ok) {
    const error = (
      parsed &&
      typeof payload === 'object' &&
      payload !== null &&
      !Array.isArray(payload)
    ) ? payload as Record<string, unknown> : {};
    const message = typeof error.error === 'string'
      ? error.error
      : fallbackMessage(response);
    const code = typeof error.code === 'string' ? error.code : 'HTTP_ERROR';

    throw new ApiClientError(response.status, code, message);
  }

  const contentType = response.headers.get('Content-Type')
    ?.split(';', 1)[0]
    .trim()
    .toLowerCase();
  if (
    contentType !== 'application/json' ||
    !parsed ||
    (isValid !== undefined && !isValid(payload))
  ) {
    throw new ApiClientError(
      response.status,
      'INVALID_RESPONSE',
      'Invalid API response',
    );
  }

  return payload as T;
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
