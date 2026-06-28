import {
  ApiProblem,
  mapBookingDatabaseError,
  normalizePhone,
  type ValidatedAppointment,
  validateCreateAppointment,
} from "../_shared/booking.ts";
import {
  generateLookupToken,
  hashLookupToken,
} from "../_shared/crypto.ts";
import {
  json,
  jsonError,
  methodNotAllowed,
  preflight,
} from "../_shared/http.ts";

const MAX_BODY_BYTES = 8192;

export interface CreateAppointmentInput extends ValidatedAppointment {
  lookup_token_hash: string;
}

export interface CreatedAppointment {
  id: string;
  status: string;
}

export interface PublicAppointmentRow {
  id: string;
  appointment_date: string;
  arrival_time: string;
  status: string;
  bike_manufacturer: string;
  bike_model: string;
  service_note: string | null;
  created_at: string;
}

export interface AppointmentsDependencies {
  todayWarsaw(): string;
  generateLookupToken(): string;
  hashLookupToken(token: string): Promise<string>;
  createAppointment(
    appointment: CreateAppointmentInput,
  ): Promise<CreatedAppointment>;
  getAppointment(
    phoneNormalized: string,
    lookupTokenHash: string,
  ): Promise<PublicAppointmentRow | null>;
  checkRateLimits(phone: string, ip: string): Promise<void>;
  checkBookingConstraints(phoneNormalized: string, date: string): Promise<void>;
  recordBookingAttempt(phone: string, ip: string): Promise<void>;
}

interface AppointmentRpcResult {
  data: unknown[] | null;
  error: { code?: string; message?: string } | null;
}

interface AppointmentRpcClient {
  rpc(
    name: string,
    params: Record<string, unknown>,
  ): PromiseLike<AppointmentRpcResult>;
}

export type AppointmentStore = Pick<
  AppointmentsDependencies,
  "createAppointment" | "getAppointment" | "checkRateLimits" | "checkBookingConstraints" | "recordBookingAttempt"
>;

const MAX_BOOKINGS_PER_PHONE_PER_DAY = 3;
const MAX_BOOKINGS_PER_IP_PER_HOUR = 5;
const MAX_AI_BOOKINGS_PER_DAY = 50;
const MAX_ACTIVE_PER_PHONE = 3;
const MAX_ADVANCE_DAYS = 14;

function databaseProblem(): ApiProblem {
  return new ApiProblem("DB_ERROR", 500, "DB_ERROR");
}

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export function createAppointmentStore(
  client: AppointmentRpcClient,
  fullClient?: SupabaseClient,
): AppointmentStore {
  const db = fullClient ?? client;
  return {
    async createAppointment(
      appointment: CreateAppointmentInput,
    ): Promise<CreatedAppointment> {
      const { data, error } = await client.rpc("create_public_appointment", {
        p_appointment_date: appointment.date,
        p_arrival_time: appointment.time,
        p_customer_name: appointment.customer_name,
        p_customer_phone: appointment.customer_phone,
        p_customer_phone_normalized:
          appointment.customer_phone_normalized,
        p_bike_manufacturer: appointment.bike_manufacturer,
        p_bike_model: appointment.bike_model,
        p_service_note: appointment.service_note,
        p_lookup_token_hash: appointment.lookup_token_hash,
      });

      if (error) {
        throw mapBookingDatabaseError(error);
      }

      const row = data?.[0] as CreatedAppointment | undefined;
      if (!row) {
        throw databaseProblem();
      }

      return row;
    },

    async getAppointment(
      phoneNormalized: string,
      lookupTokenHash: string,
    ): Promise<PublicAppointmentRow | null> {
      const { data, error } = await client.rpc("get_public_appointment", {
        p_phone_normalized: phoneNormalized,
        p_lookup_token_hash: lookupTokenHash,
      });

      if (error) {
        throw databaseProblem();
      }

      return (data?.[0] as PublicAppointmentRow | undefined) ?? null;
    },

    async checkRateLimits(phone: string, ip: string): Promise<void> {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 86400000).toISOString();
      const oneHourAgo = new Date(now.getTime() - 3600000).toISOString();

      const { count: phoneCount } = await db
        .from("booking_rate_limits")
        .select("*", { count: "exact", head: true })
        .eq("phone", phone)
        .gte("created_at", oneDayAgo);

      if ((phoneCount ?? 0) >= MAX_BOOKINGS_PER_PHONE_PER_DAY) {
        throw new ApiProblem("RATE_LIMIT_PHONE", 429,
          `Maximum ${MAX_BOOKINGS_PER_PHONE_PER_DAY} booking attempts per phone per day.`);
      }

      if (ip !== "unknown") {
        const { count: ipCount } = await db
          .from("booking_rate_limits")
          .select("*", { count: "exact", head: true })
          .eq("ip_address", ip)
          .gte("created_at", oneHourAgo);

        if ((ipCount ?? 0) >= MAX_BOOKINGS_PER_IP_PER_HOUR) {
          throw new ApiProblem("RATE_LIMIT_IP", 429,
            "Too many requests from this IP. Try again later.");
        }
      }

      const { count: globalCount } = await db
        .from("booking_rate_limits")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneDayAgo);

      if ((globalCount ?? 0) >= MAX_AI_BOOKINGS_PER_DAY) {
        throw new ApiProblem("RATE_LIMIT_GLOBAL", 429,
          "Daily booking limit reached. Please call 511 061 221 to book.");
      }
    },

    async checkBookingConstraints(
      phoneNormalized: string,
      date: string,
    ): Promise<void> {
      const { count: activeCount } = await db
        .from("service_appointments")
        .select("*", { count: "exact", head: true })
        .eq("customer_phone_normalized", phoneNormalized)
        .in("status", ["zapytanie", "potwierdzone"]);

      if ((activeCount ?? 0) >= MAX_ACTIVE_PER_PHONE) {
        throw new ApiProblem("MAX_ACTIVE_REACHED", 400,
          `Maximum ${MAX_ACTIVE_PER_PHONE} active bookings per phone number.`);
      }

      const { count: dupCount } = await db
        .from("service_appointments")
        .select("*", { count: "exact", head: true })
        .eq("customer_phone_normalized", phoneNormalized)
        .eq("appointment_date", date)
        .in("status", ["zapytanie", "potwierdzone"]);

      if ((dupCount ?? 0) > 0) {
        throw new ApiProblem("DUPLICATE_DATE", 409,
          "You already have a booking for this date. Call 511 061 221 for changes.");
      }
    },

    async recordBookingAttempt(phone: string, ip: string): Promise<void> {
      await db.from("booking_rate_limits").insert({
        phone,
        ip_address: ip,
      });
    },
  };
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isJsonContentType(value: string | null): boolean {
  return value?.split(";", 1)[0].trim().toLowerCase() === "application/json";
}

function apiProblemResponse(error: ApiProblem): Response {
  return jsonError(error.message, error.code, error.status);
}

function notFound(): Response {
  return jsonError("Appointment not found", "NOT_FOUND", 404);
}

function requestProblem(
  message: string,
  code: string,
  status: number,
): ApiProblem {
  return new ApiProblem(code, status, message);
}

async function readBoundedBody(req: Request): Promise<string> {
  const contentLength = req.headers.get("Content-Length")?.trim();
  if (
    contentLength &&
    /^\d+$/.test(contentLength) &&
    BigInt(contentLength) > BigInt(MAX_BODY_BYTES)
  ) {
    throw requestProblem(
      "Request body too large",
      "PAYLOAD_TOO_LARGE",
      413,
    );
  }

  if (!req.body) {
    throw requestProblem("Invalid JSON body", "INVALID_JSON", 400);
  }

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      byteLength += value.byteLength;
      if (byteLength > MAX_BODY_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // Cancellation is best-effort; the request is already rejected.
        }
        throw requestProblem(
          "Request body too large",
          "PAYLOAD_TOO_LARGE",
          413,
        );
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(bytes);
}

async function handlePost(
  req: Request,
  deps: AppointmentsDependencies,
): Promise<Response> {
  if (!isJsonContentType(req.headers.get("Content-Type"))) {
    return jsonError(
      "Content-Type must be application/json",
      "UNSUPPORTED_MEDIA_TYPE",
      415,
    );
  }

  let rawBody: string;
  try {
    rawBody = await readBoundedBody(req);
  } catch (error) {
    if (error instanceof ApiProblem) {
      return apiProblemResponse(error);
    }

    return jsonError("Invalid JSON body", "INVALID_JSON", 400);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonError("Invalid JSON body", "INVALID_JSON", 400);
  }

  try {
    const appointment = validateCreateAppointment(body, deps.todayWarsaw());

    // Advance booking window check
    const today = new Date(deps.todayWarsaw() + "T00:00:00");
    const bookingDate = new Date(appointment.date + "T00:00:00");
    const diffDays = Math.floor(
      (bookingDate.getTime() - today.getTime()) / 86400000,
    );
    if (diffDays > MAX_ADVANCE_DAYS) {
      throw new ApiProblem(
        "TOO_FAR_AHEAD",
        400,
        `Bookings can be made up to ${MAX_ADVANCE_DAYS} days in advance. Call 511 061 221 for later dates.`,
      );
    }

    // Rate limiting & booking constraints
    const clientIp = getClientIp(req);
    await deps.checkRateLimits(appointment.customer_phone, clientIp);
    await deps.checkBookingConstraints(
      appointment.customer_phone_normalized,
      appointment.date,
    );

    const token = deps.generateLookupToken();
    const lookupTokenHash = await deps.hashLookupToken(token);
    const created = await deps.createAppointment({
      ...appointment,
      lookup_token_hash: lookupTokenHash,
    });

    // Record successful attempt for rate tracking
    await deps.recordBookingAttempt(appointment.customer_phone, clientIp);

    return json(
      {
        id: created.id,
        status: created.status,
        lookup_token: token,
        message:
          "Rezerwacja utworzona. Serwis oddzwoni w celu potwierdzenia.",
      },
      201,
    );
  } catch (error) {
    if (error instanceof ApiProblem) {
      return apiProblemResponse(error);
    }

    return jsonError("Failed to create appointment", "DB_ERROR", 500);
  }
}

async function handleGet(
  req: Request,
  deps: AppointmentsDependencies,
): Promise<Response> {
  const phone = req.headers.get("X-Customer-Phone");
  const token = req.headers.get("X-Lookup-Token");

  if (!phone?.trim()) {
    return jsonError(
      "Missing X-Customer-Phone header",
      "MISSING_PHONE",
      400,
    );
  }

  if (!token?.trim()) {
    return jsonError(
      "Missing X-Lookup-Token header",
      "MISSING_TOKEN",
      400,
    );
  }

  let phoneNormalized: string;
  try {
    phoneNormalized = normalizePhone(phone);
  } catch {
    return notFound();
  }

  try {
    const lookupTokenHash = await deps.hashLookupToken(token);
    const appointment = await deps.getAppointment(
      phoneNormalized,
      lookupTokenHash,
    );

    if (!appointment) {
      return notFound();
    }

    return json({
      id: appointment.id,
      date: appointment.appointment_date,
      time: appointment.arrival_time.slice(0, 5),
      status: appointment.status,
      bike_manufacturer: appointment.bike_manufacturer,
      bike_model: appointment.bike_model,
      service_note: appointment.service_note,
      created_at: appointment.created_at,
    });
  } catch (error) {
    if (error instanceof ApiProblem) {
      return apiProblemResponse(error);
    }

    return jsonError("Failed to fetch appointment", "DB_ERROR", 500);
  }
}

export async function handleAppointments(
  req: Request,
  deps: AppointmentsDependencies,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return preflight();
  }

  if (req.method === "POST") {
    return handlePost(req, deps);
  }

  if (req.method === "GET") {
    return handleGet(req, deps);
  }

  return methodNotAllowed();
}

export function getWarsawDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  const supabaseModule = "npm:@supabase/supabase-js@2";
  const { createClient } = await import(/* @vite-ignore */ supabaseModule);
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const store = createAppointmentStore(client, client);
  const dependencies: AppointmentsDependencies = {
    ...store,
    todayWarsaw: () => getWarsawDate(),
    generateLookupToken,
    hashLookupToken,
  };

  Deno.serve((req: Request) => handleAppointments(req, dependencies));
}
