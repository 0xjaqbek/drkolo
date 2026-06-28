/* global Deno */

import {
  ApiProblem,
  normalizePhone,
  validateCalendarDate,
} from "../_shared/booking.ts";
import { verifyAdminPassword } from "../_shared/admin-auth.ts";
import {
  json,
  jsonError,
  methodNotAllowed,
  preflight,
} from "../_shared/http.ts";

const MAX_BODY_BYTES = 8192;
const MAX_DURATION_MINUTES = 1440;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_PATTERN =
  /^((?:[01]\d|2[0-3])):([0-5]\d)(?::([0-5]\d))?$/;
const APPOINTMENT_STATUSES = new Set([
  "zapytanie",
  "potwierdzone",
  "odrzucone",
  "zakonczone",
]);

const WORKING_HOURS_FIELDS =
  "id, day_of_week, open_time, close_time, is_open";
const APPOINTMENT_FIELDS =
  "id, appointment_date, arrival_time, customer_name, customer_phone, bike_manufacturer, bike_model, service_note, status, estimated_duration_minutes, technician_note, source, created_at";
const BLOCKED_TIME_FIELDS =
  "id, block_date, start_time, end_time, reason, created_at";

export interface WorkingHoursRow {
  id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_open: boolean;
}

export interface AdminAppointmentRow {
  id: string;
  appointment_date: string;
  arrival_time: string;
  customer_name: string;
  customer_phone: string;
  bike_manufacturer: string;
  bike_model: string;
  service_note: string | null;
  status: string;
  estimated_duration_minutes: number | null;
  technician_note: string | null;
  source: string;
  created_at: string;
}

export interface BlockedTimeRow {
  id: string;
  block_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
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
  customer_phone_normalized: string;
  bike_manufacturer: string;
  bike_model: string;
  service_note: string | null;
  status: "potwierdzone";
  estimated_duration_minutes: number;
  technician_note: null;
  source: "manual";
}

export interface AppointmentUpdate {
  status?: string;
  appointment_date?: string;
  arrival_time?: string;
  estimated_duration_minutes?: number | null;
  technician_note?: string | null;
}

export interface BlockedTimeInput {
  block_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
}

export interface CalendarAdminDatabaseDependencies {
  listWorkingHours(): Promise<WorkingHoursRow[]>;
  updateWorkingHours(
    id: string,
    update: WorkingHoursUpdate,
  ): Promise<WorkingHoursRow | null>;
  listAppointments(date: string): Promise<AdminAppointmentRow[]>;
  listPendingAppointments(): Promise<AdminAppointmentRow[]>;
  createAppointment(
    appointment: ManualAppointmentInput,
  ): Promise<AdminAppointmentRow>;
  updateAppointment(
    id: string,
    update: AppointmentUpdate,
  ): Promise<AdminAppointmentRow | null>;
  listBlockedTimes(date: string): Promise<BlockedTimeRow[]>;
  createBlockedTime(block: BlockedTimeInput): Promise<BlockedTimeRow>;
  deleteBlockedTime(id: string): Promise<boolean>;
}

export interface CalendarAdminDependencies
  extends CalendarAdminDatabaseDependencies {
  adminPassword: string | undefined;
  todayWarsaw(): string;
}

type CalendarAdminTable =
  | "service_working_hours"
  | "service_appointments"
  | "service_blocked_times";

interface CalendarAdminQueryResult<T> {
  data: T | null;
  error: unknown;
}

interface CalendarAdminQuery<T> extends
  PromiseLike<CalendarAdminQueryResult<T>> {
  select(columns: string): CalendarAdminQuery<T>;
  order(column: string): CalendarAdminQuery<T>;
  eq(column: string, value: unknown): CalendarAdminQuery<T>;
  neq(column: string, value: unknown): CalendarAdminQuery<T>;
  update(value: unknown): CalendarAdminQuery<T>;
  insert(value: unknown): CalendarAdminQuery<T>;
  delete(): CalendarAdminQuery<T>;
  single<TResult = T>(): PromiseLike<CalendarAdminQueryResult<TResult>>;
  maybeSingle<TResult = T>(): PromiseLike<
    CalendarAdminQueryResult<TResult | null>
  >;
}

interface CalendarAdminClient {
  from<T>(table: CalendarAdminTable): CalendarAdminQuery<T>;
  rpc<T>(
    functionName: string,
    args: Record<string, unknown>,
  ): PromiseLike<CalendarAdminQueryResult<T>>;
}

function requestProblem(
  message: string,
  code: string,
  status = 400,
): ApiProblem {
  return new ApiProblem(code, status, message);
}

function apiProblemResponse(error: ApiProblem): Response {
  return jsonError(error.message, error.code, error.status);
}

function unauthorized(): Response {
  return jsonError("Unauthorized", "UNAUTHORIZED", 401);
}

function notFound(): Response {
  return jsonError("Not found", "NOT_FOUND", 404);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertAllowedFields(
  value: Record<string, unknown>,
  allowed: readonly string[],
  requireAtLeastOne = false,
): void {
  const keys = Object.keys(value);
  if (
    (requireAtLeastOne && keys.length === 0) ||
    keys.some((key) => !allowed.includes(key))
  ) {
    throw requestProblem("Invalid fields", "INVALID_FIELDS");
  }
}

function requiredString(
  value: Record<string, unknown>,
  field: string,
  maxLength: number,
): string {
  const candidate = value[field];
  if (typeof candidate !== "string") {
    throw requestProblem("Invalid fields", "INVALID_FIELDS");
  }

  const trimmed = candidate.trim();
  if (!trimmed || trimmed.length > maxLength) {
    throw requestProblem("Invalid fields", "INVALID_FIELDS");
  }

  return trimmed;
}

function optionalText(
  value: unknown,
  maxLength: number,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw requestProblem("Invalid fields", "INVALID_FIELDS");
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw requestProblem("Invalid fields", "INVALID_FIELDS");
  }

  return trimmed || null;
}

function validateUuid(value: string | null): string {
  if (!value || !UUID_PATTERN.test(value)) {
    throw requestProblem("Invalid id", "INVALID_UUID");
  }
  return value;
}

function normalizeTime(
  value: unknown,
  requireHalfHour: boolean,
): string {
  if (typeof value !== "string") {
    throw requestProblem("Invalid time", "INVALID_TIME");
  }

  const match = TIME_PATTERN.exec(value);
  if (
    !match ||
    (match[3] !== undefined && match[3] !== "00") ||
    (requireHalfHour && match[2] !== "00" && match[2] !== "30")
  ) {
    throw requestProblem("Invalid time", "INVALID_TIME");
  }

  return `${match[1]}:${match[2]}:00`;
}

function validateDuration(
  value: unknown,
  nullable: boolean,
): number | null {
  if (nullable && value === null) {
    return null;
  }
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_DURATION_MINUTES
  ) {
    throw requestProblem("Invalid duration", "INVALID_DURATION");
  }
  return value;
}

function validateNonPastDate(value: unknown, todayWarsaw: string): string {
  const date = validateCalendarDate(value);
  if (date < validateCalendarDate(todayWarsaw)) {
    throw requestProblem("Date is in the past", "DATE_PAST");
  }
  return date;
}

function validateWorkingHoursUpdate(value: unknown): WorkingHoursUpdate {
  if (!isRecord(value)) {
    throw requestProblem("Invalid fields", "INVALID_FIELDS");
  }
  assertAllowedFields(value, ["open_time", "close_time", "is_open"]);

  if (
    !Object.hasOwn(value, "open_time") ||
    !Object.hasOwn(value, "close_time") ||
    typeof value.is_open !== "boolean"
  ) {
    throw requestProblem("Invalid fields", "INVALID_FIELDS");
  }

  if (!value.is_open) {
    if (value.open_time !== null || value.close_time !== null) {
      throw requestProblem("Invalid fields", "INVALID_FIELDS");
    }
    return { open_time: null, close_time: null, is_open: false };
  }

  const openTime = normalizeTime(value.open_time, true);
  const closeTime = normalizeTime(value.close_time, true);
  if (openTime >= closeTime) {
    throw requestProblem("Invalid time range", "INVALID_TIME_RANGE");
  }

  return {
    open_time: openTime,
    close_time: closeTime,
    is_open: true,
  };
}

function validateManualAppointment(
  value: unknown,
  todayWarsaw: string,
): ManualAppointmentInput {
  if (!isRecord(value)) {
    throw requestProblem("Invalid fields", "INVALID_FIELDS");
  }
  assertAllowedFields(value, [
    "appointment_date",
    "arrival_time",
    "customer_name",
    "customer_phone",
    "bike_manufacturer",
    "bike_model",
    "service_note",
    "estimated_duration_minutes",
  ]);

  const customerPhone = requiredString(value, "customer_phone", 40);

  return {
    appointment_date: validateNonPastDate(
      value.appointment_date,
      todayWarsaw,
    ),
    arrival_time: normalizeTime(value.arrival_time, true),
    customer_name: requiredString(value, "customer_name", 120),
    customer_phone: customerPhone,
    customer_phone_normalized: normalizePhone(customerPhone),
    bike_manufacturer: requiredString(value, "bike_manufacturer", 120),
    bike_model: requiredString(value, "bike_model", 120),
    service_note: optionalText(value.service_note, 2000),
    status: "potwierdzone",
    estimated_duration_minutes: validateDuration(
      value.estimated_duration_minutes,
      false,
    )!,
    technician_note: null,
    source: "manual",
  };
}

function validateAppointmentUpdate(
  value: unknown,
  todayWarsaw: string,
): AppointmentUpdate {
  if (!isRecord(value)) {
    throw requestProblem("Invalid fields", "INVALID_FIELDS");
  }
  assertAllowedFields(
    value,
    [
      "status",
      "appointment_date",
      "arrival_time",
      "estimated_duration_minutes",
      "technician_note",
    ],
    true,
  );

  const update: AppointmentUpdate = {};
  if (Object.hasOwn(value, "status")) {
    if (
      typeof value.status !== "string" ||
      !APPOINTMENT_STATUSES.has(value.status)
    ) {
      throw requestProblem("Invalid status", "INVALID_STATUS");
    }
    update.status = value.status;
  }
  if (Object.hasOwn(value, "appointment_date")) {
    update.appointment_date = validateNonPastDate(
      value.appointment_date,
      todayWarsaw,
    );
  }
  if (Object.hasOwn(value, "arrival_time")) {
    update.arrival_time = normalizeTime(value.arrival_time, true);
  }
  if (Object.hasOwn(value, "estimated_duration_minutes")) {
    update.estimated_duration_minutes = validateDuration(
      value.estimated_duration_minutes,
      true,
    );
  }
  if (Object.hasOwn(value, "technician_note")) {
    update.technician_note = optionalText(value.technician_note, 4000);
  }

  return update;
}

function validateBlockedTime(value: unknown): BlockedTimeInput {
  if (!isRecord(value)) {
    throw requestProblem("Invalid fields", "INVALID_FIELDS");
  }
  assertAllowedFields(value, [
    "block_date",
    "start_time",
    "end_time",
    "reason",
  ]);

  const startTime = normalizeTime(value.start_time, false);
  const endTime = normalizeTime(value.end_time, false);
  if (startTime >= endTime) {
    throw requestProblem("Invalid time range", "INVALID_TIME_RANGE");
  }

  return {
    block_date: validateCalendarDate(value.block_date),
    start_time: startTime,
    end_time: endTime,
    reason: optionalText(value.reason, 500),
  };
}

function isJsonContentType(value: string | null): boolean {
  return value?.split(";", 1)[0].trim().toLowerCase() === "application/json";
}

async function readBoundedJson(req: Request): Promise<unknown> {
  if (!isJsonContentType(req.headers.get("Content-Type"))) {
    throw requestProblem(
      "Content-Type must be application/json",
      "UNSUPPORTED_MEDIA_TYPE",
      415,
    );
  }

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
    throw requestProblem("Invalid JSON body", "INVALID_JSON");
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

  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw requestProblem("Invalid JSON body", "INVALID_JSON");
  }
}

function workingHoursJson(row: WorkingHoursRow): WorkingHoursRow {
  return {
    id: row.id,
    day_of_week: row.day_of_week,
    open_time: row.open_time,
    close_time: row.close_time,
    is_open: row.is_open,
  };
}

function appointmentJson(row: AdminAppointmentRow): AdminAppointmentRow {
  return {
    id: row.id,
    appointment_date: row.appointment_date,
    arrival_time: row.arrival_time,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    bike_manufacturer: row.bike_manufacturer,
    bike_model: row.bike_model,
    service_note: row.service_note,
    status: row.status,
    estimated_duration_minutes: row.estimated_duration_minutes,
    technician_note: row.technician_note,
    source: row.source,
    created_at: row.created_at,
  };
}

function blockedTimeJson(row: BlockedTimeRow): BlockedTimeRow {
  return {
    id: row.id,
    block_date: row.block_date,
    start_time: row.start_time,
    end_time: row.end_time,
    reason: row.reason,
    created_at: row.created_at,
  };
}

async function runAppointmentMutation<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isRecord(error)) {
      switch (error.code) {
        case "DRK01":
          throw requestProblem("Day closed", "DAY_CLOSED");
        case "DRK02":
          throw requestProblem("Invalid slot", "INVALID_SLOT");
        case "DRK03":
        case "23505":
          throw requestProblem("Slot taken", "SLOT_TAKEN", 409);
      }
    }
    throw error;
  }
}

export async function handleCalendarAdmin(
  req: Request,
  deps: CalendarAdminDependencies,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return preflight();
  }

  const authenticated = await verifyAdminPassword(
    req.headers.get("X-Admin-Password"),
    deps.adminPassword,
  );
  if (!authenticated) {
    return unauthorized();
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    switch (action) {
      case "verify":
        if (req.method !== "GET") {
          return methodNotAllowed();
        }
        return json({ authenticated: true });

      case "working-hours":
        if (req.method === "GET") {
          const rows = await deps.listWorkingHours();
          return json(rows.map(workingHoursJson));
        }
        if (req.method === "PATCH") {
          const id = validateUuid(url.searchParams.get("id"));
          const update = validateWorkingHoursUpdate(
            await readBoundedJson(req),
          );
          const row = await deps.updateWorkingHours(id, update);
          return row ? json(workingHoursJson(row)) : notFound();
        }
        return methodNotAllowed();

      case "appointments":
        if (req.method === "GET") {
          const date = validateCalendarDate(
            url.searchParams.get("date"),
          );
          const rows = await deps.listAppointments(date);
          return json(rows.map(appointmentJson));
        }
        if (req.method === "POST") {
          const appointment = validateManualAppointment(
            await readBoundedJson(req),
            deps.todayWarsaw(),
          );
          const row = await runAppointmentMutation(
            () => deps.createAppointment(appointment),
          );
          return json(appointmentJson(row), 201);
        }
        if (req.method === "PATCH") {
          const id = validateUuid(url.searchParams.get("id"));
          const update = validateAppointmentUpdate(
            await readBoundedJson(req),
            deps.todayWarsaw(),
          );
          const row = await runAppointmentMutation(
            () => deps.updateAppointment(id, update),
          );
          return row ? json(appointmentJson(row)) : notFound();
        }
        return methodNotAllowed();

      case "pending":
        if (req.method !== "GET") {
          return methodNotAllowed();
        }
        return json(
          (await deps.listPendingAppointments()).map(appointmentJson),
        );

      case "blocked-times":
        if (req.method === "GET") {
          const date = validateCalendarDate(
            url.searchParams.get("date"),
          );
          const rows = await deps.listBlockedTimes(date);
          return json(rows.map(blockedTimeJson));
        }
        if (req.method === "POST") {
          const block = validateBlockedTime(await readBoundedJson(req));
          const row = await deps.createBlockedTime(block);
          return json(blockedTimeJson(row), 201);
        }
        if (req.method === "DELETE") {
          const id = validateUuid(url.searchParams.get("id"));
          const deleted = await deps.deleteBlockedTime(id);
          return deleted ? json({ id, deleted: true }) : notFound();
        }
        return methodNotAllowed();

      default:
        return notFound();
    }
  } catch (error) {
    if (error instanceof ApiProblem) {
      return apiProblemResponse(error);
    }
    return jsonError(
      "Database operation failed",
      "DB_ERROR",
      500,
    );
  }
}

function throwOnDatabaseError(error: unknown): void {
  if (error) {
    throw error;
  }
}

function getWarsawDate(now = new Date()): string {
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

export function createCalendarAdminDependencies(
  client: CalendarAdminClient,
): CalendarAdminDatabaseDependencies {
  return {
    async listWorkingHours(): Promise<WorkingHoursRow[]> {
      const { data, error } = await client
        .from<WorkingHoursRow[]>("service_working_hours")
        .select(WORKING_HOURS_FIELDS)
        .order("day_of_week");
      throwOnDatabaseError(error);
      return (data ?? []) as WorkingHoursRow[];
    },

    async updateWorkingHours(
      id: string,
      update: WorkingHoursUpdate,
    ): Promise<WorkingHoursRow | null> {
      const { data, error } = await client
        .from<WorkingHoursRow>("service_working_hours")
        .update(update)
        .eq("id", id)
        .select(WORKING_HOURS_FIELDS)
        .maybeSingle<WorkingHoursRow>();
      throwOnDatabaseError(error);
      return (data as WorkingHoursRow | null) ?? null;
    },

    async listAppointments(date: string): Promise<AdminAppointmentRow[]> {
      const { data, error } = await client
        .from<AdminAppointmentRow[]>("service_appointments")
        .select(APPOINTMENT_FIELDS)
        .eq("appointment_date", date)
        .neq("status", "odrzucone")
        .order("arrival_time");
      throwOnDatabaseError(error);
      return (data ?? []) as AdminAppointmentRow[];
    },

    async listPendingAppointments(): Promise<AdminAppointmentRow[]> {
      const { data, error } = await client
        .from<AdminAppointmentRow[]>("service_appointments")
        .select(APPOINTMENT_FIELDS)
        .eq("status", "zapytanie")
        .order("appointment_date")
        .order("arrival_time");
      throwOnDatabaseError(error);
      return (data ?? []) as AdminAppointmentRow[];
    },

    async createAppointment(
      appointment: ManualAppointmentInput,
    ): Promise<AdminAppointmentRow> {
      const { data, error } = await client.rpc<AdminAppointmentRow[]>(
        "create_admin_appointment",
        {
          p_appointment_date: appointment.appointment_date,
          p_arrival_time: appointment.arrival_time,
          p_customer_name: appointment.customer_name,
          p_customer_phone: appointment.customer_phone,
          p_customer_phone_normalized:
            appointment.customer_phone_normalized,
          p_bike_manufacturer: appointment.bike_manufacturer,
          p_bike_model: appointment.bike_model,
          p_service_note: appointment.service_note,
          p_estimated_duration_minutes:
            appointment.estimated_duration_minutes,
        },
      );
      throwOnDatabaseError(error);
      if (!data?.[0]) {
        throw new Error("Database operation failed");
      }
      return data[0];
    },

    async updateAppointment(
      id: string,
      update: AppointmentUpdate,
    ): Promise<AdminAppointmentRow | null> {
      const { data, error } = await client.rpc<AdminAppointmentRow[]>(
        "update_admin_appointment",
        {
          p_id: id,
          p_apply_status: Object.hasOwn(update, "status"),
          p_status: update.status ?? null,
          p_apply_appointment_date:
            Object.hasOwn(update, "appointment_date"),
          p_appointment_date: update.appointment_date ?? null,
          p_apply_arrival_time: Object.hasOwn(update, "arrival_time"),
          p_arrival_time: update.arrival_time ?? null,
          p_apply_estimated_duration_minutes:
            Object.hasOwn(update, "estimated_duration_minutes"),
          p_estimated_duration_minutes:
            update.estimated_duration_minutes ?? null,
          p_apply_technician_note:
            Object.hasOwn(update, "technician_note"),
          p_technician_note: update.technician_note ?? null,
        },
      );
      throwOnDatabaseError(error);
      return data?.[0] ?? null;
    },

    async listBlockedTimes(date: string): Promise<BlockedTimeRow[]> {
      const { data, error } = await client
        .from<BlockedTimeRow[]>("service_blocked_times")
        .select(BLOCKED_TIME_FIELDS)
        .eq("block_date", date)
        .order("start_time");
      throwOnDatabaseError(error);
      return (data ?? []) as BlockedTimeRow[];
    },

    async createBlockedTime(
      block: BlockedTimeInput,
    ): Promise<BlockedTimeRow> {
      const { data, error } = await client
        .from<BlockedTimeRow>("service_blocked_times")
        .insert(block)
        .select(BLOCKED_TIME_FIELDS)
        .single<BlockedTimeRow>();
      throwOnDatabaseError(error);
      if (!data) {
        throw new Error("Database operation failed");
      }
      return data as BlockedTimeRow;
    },

    async deleteBlockedTime(id: string): Promise<boolean> {
      const { data, error } = await client
        .from<{ id: string }>("service_blocked_times")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle<{ id: string }>();
      throwOnDatabaseError(error);
      return Boolean(data);
    },
  };
}

if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  const { createClient } = await import(
    "https://esm.sh/@supabase/supabase-js@2"
  );
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const dependencies: CalendarAdminDependencies = {
    adminPassword: Deno.env.get("ADMIN_PASSWORD"),
    todayWarsaw: () => getWarsawDate(),
    ...createCalendarAdminDependencies(
      client as unknown as CalendarAdminClient,
    ),
  };

  Deno.serve((req: Request) => handleCalendarAdmin(req, dependencies));
}
