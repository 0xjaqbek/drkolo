// @vitest-environment node

import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import {
  ApiProblem,
  mapBookingDatabaseError,
  normalizePhone,
  validateCalendarDate,
  validateCreateAppointment,
} from "./booking.ts";
import { verifyAdminPassword } from "./admin-auth.ts";
import { json, jsonError, methodNotAllowed, preflight } from "./http.ts";
import { handleServices } from "../services/index.ts";
import {
  createAvailabilityDependencies,
  handleAvailability,
} from "../availability/index.ts";
import {
  type AppointmentsDependencies,
  createAppointmentStore,
  getWarsawDate,
  handleAppointments,
} from "../appointments/index.ts";
import {
  type CalendarAdminDependencies,
  handleCalendarAdmin,
} from "../calendar-admin/index.ts";

const validBody = {
  date: "2026-06-10",
  time: "10:30",
  customer_name: " Jan ",
  customer_phone: " +48 600-123-456 ",
  bike_manufacturer: " Trek ",
  bike_model: " Fuel EX ",
  service_note: " Full service ",
};

describe("verifyAdminPassword", () => {
  it("accepts equal non-empty passwords", async () => {
    await expect(
      verifyAdminPassword("correct", "correct"),
    ).resolves.toBe(true);
  });

  it("rejects unequal passwords", async () => {
    await expect(
      verifyAdminPassword("wrong", "correct"),
    ).resolves.toBe(false);
  });

  it.each([
    ["", "correct"],
    ["correct", ""],
    [undefined, "correct"],
    ["correct", undefined],
  ])("rejects empty or missing values", async (supplied, configured) => {
    await expect(
      verifyAdminPassword(supplied, configured),
    ).resolves.toBe(false);
  });

  it.each([
    [undefined, "correct", ["", "correct"]],
    ["correct", undefined, ["correct", ""]],
    ["", "", ["", ""]],
  ] as const)(
    "hashes both normalized inputs before rejecting empty credentials",
    async (supplied, configured, expectedInputs) => {
      const digest = vi.fn(async (value: string) => {
        return new Uint8Array(32).fill(value.length);
      });

      await expect(
        verifyAdminPassword(supplied, configured, digest),
      ).resolves.toBe(false);
      expect(digest.mock.calls.map(([value]) => value)).toEqual(
        expectedInputs,
      );
    },
  );
});

function expectApiProblem(
  action: () => unknown,
  code: string,
  status: number,
): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(ApiProblem);
    expect(error).toMatchObject({ code, status });
    return;
  }

  throw new Error(`Expected ApiProblem ${code}/${status}`);
}

describe("normalizePhone", () => {
  it("normalizes Polish display formatting", () => {
    expect(normalizePhone("+48 600-123-456")).toBe("48600123456");
  });

  it("accepts parentheses and Unicode whitespace", () => {
    expect(normalizePhone("+48\u00a0(600) 123-456")).toBe("48600123456");
  });

  it("rejects fewer than nine digits", () => {
    expectApiProblem(() => normalizePhone("123"), "INVALID_PHONE", 400);
  });

  it("rejects more than fifteen digits", () => {
    expectApiProblem(
      () => normalizePhone("1234567890123456"),
      "INVALID_PHONE",
      400,
    );
  });

  it("rejects letters instead of stripping them", () => {
    expectApiProblem(
      () => normalizePhone("+48 600-ABC-123-456"),
      "INVALID_PHONE",
      400,
    );
  });

  it("rejects a plus sign outside the leading position", () => {
    expectApiProblem(
      () => normalizePhone("48+600123456"),
      "INVALID_PHONE",
      400,
    );
  });
});

describe("validateCalendarDate", () => {
  it("rejects impossible dates", () => {
    expectApiProblem(
      () => validateCalendarDate("2026-02-30"),
      "INVALID_DATE",
      400,
    );
  });
});

describe("validateCreateAppointment", () => {
  it("trims accepted strings and returns the normalized phone", () => {
    expect(validateCreateAppointment(validBody, "2026-06-10")).toEqual({
      date: "2026-06-10",
      time: "10:30",
      customer_name: "Jan",
      customer_phone: "+48 600-123-456",
      customer_phone_normalized: "48600123456",
      bike_manufacturer: "Trek",
      bike_model: "Fuel EX",
      service_note: "Full service",
    });
  });

  it("rejects non-string field values", () => {
    expectApiProblem(
      () =>
        validateCreateAppointment(
          { ...validBody, bike_model: 12 },
          "2026-06-10",
        ),
      "INVALID_FIELDS",
      400,
    );
  });

  it("rejects dates before the supplied Warsaw date", () => {
    expectApiProblem(
      () =>
        validateCreateAppointment(
          { ...validBody, date: "2026-06-09" },
          "2026-06-10",
        ),
      "DATE_PAST",
      400,
    );
  });

  it.each(["10", "10:15", "9:30", "24:00"])(
    "rejects invalid appointment time %s",
    (time) => {
      expectApiProblem(
        () =>
          validateCreateAppointment({ ...validBody, time }, "2026-06-10"),
        "INVALID_TIME",
        400,
      );
    },
  );

  it("rejects impossible appointment dates", () => {
    expectApiProblem(
      () =>
        validateCreateAppointment(
          { ...validBody, date: "2026-02-30" },
          "2026-01-01",
        ),
      "INVALID_DATE",
      400,
    );
  });

  it.each([
    ["customer_name", 120],
    ["customer_phone", 40],
    ["bike_manufacturer", 120],
    ["bike_model", 120],
    ["service_note", 2000],
  ] as const)("rejects %s longer than %i characters", (field, maxLength) => {
    expectApiProblem(
      () =>
        validateCreateAppointment(
          { ...validBody, [field]: "x".repeat(maxLength + 1) },
          "2026-06-10",
        ),
      "INVALID_FIELDS",
      400,
    );
  });

  it.each([
    "customer_name",
    "customer_phone",
    "bike_manufacturer",
    "bike_model",
    "service_note",
  ] as const)("rejects an empty trimmed %s", (field) => {
    expectApiProblem(
      () =>
        validateCreateAppointment(
          { ...validBody, [field]: "   " },
          "2026-06-10",
        ),
      "INVALID_FIELDS",
      400,
    );
  });
});

describe("mapBookingDatabaseError", () => {
  it.each([
    ["DRK01", "DAY_CLOSED", 400],
    ["DRK02", "INVALID_SLOT", 400],
    ["DRK03", "SLOT_TAKEN", 409],
    ["23505", "SLOT_TAKEN", 409],
    ["XX000", "DB_ERROR", 500],
  ] as const)("maps %s to %s/%i", (databaseCode, apiCode, status) => {
    const problem = mapBookingDatabaseError({ code: databaseCode });

    expect(problem).toBeInstanceOf(ApiProblem);
    expect(problem).toMatchObject({ code: apiCode, status });
  });
});

describe("HTTP response helpers", () => {
  it.each([
    ["Access-Control-Allow-Origin", "*"],
    [
      "Access-Control-Allow-Headers",
      "authorization, apikey, x-client-info, x-admin-password, x-customer-phone, x-lookup-token, content-type",
    ],
    [
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, DELETE, OPTIONS",
    ],
    ["Content-Type", "application/json; charset=utf-8"],
    ["Cache-Control", "no-store"],
  ])("sets %s on JSON responses", (header, value) => {
    expect(json({ ok: true }).headers.get(header)).toBe(value);
  });

  it("serializes standard API errors", async () => {
    const response = jsonError("Invalid request", "INVALID_REQUEST", 400);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request",
      code: "INVALID_REQUEST",
    });
  });

  it("returns a bodyless CORS preflight response", async () => {
    const response = preflight();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "authorization, apikey, x-client-info, x-admin-password, x-customer-phone, x-lookup-token, content-type",
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST, PATCH, DELETE, OPTIONS",
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.text()).toBe("");
  });

  it("returns a standard method-not-allowed problem", async () => {
    const response = methodNotAllowed();

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toEqual({
      error: "Method not allowed",
      code: "METHOD_NOT_ALLOWED",
    });
  });
});

describe("services handler", () => {
  it("preserves the public service catalog for GET requests", async () => {
    const response = await handleServices(
      new Request("https://example.test/services"),
    );
    const catalog = await response.json();

    expect(response.status).toBe(200);
    expect(catalog.categories).toHaveLength(5);
    expect(catalog.categories[0].services[0]).toMatchObject({
      price_pln: 649,
    });
    expect(catalog.categories[4].services[2]).toMatchObject({
      price_pln: 30,
    });
  });

  it("supports OPTIONS and rejects all other methods", async () => {
    const options = await handleServices(
      new Request("https://example.test/services", { method: "OPTIONS" }),
    );
    const post = await handleServices(
      new Request("https://example.test/services", { method: "POST" }),
    );

    expect(options.status).toBe(204);
    expect(post.status).toBe(405);
    await expect(post.json()).resolves.toMatchObject({
      code: "METHOD_NOT_ALLOWED",
    });
  });
});

describe("availability handler", () => {
  it("rejects impossible calendar dates without querying the database", async () => {
    const getAvailability = vi.fn();
    const response = await handleAvailability(
      new Request("https://example.test/availability?date=2026-02-30"),
      { getAvailability },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_DATE",
    });
    expect(getAvailability).not.toHaveBeenCalled();
  });

  it("rejects non-GET methods", async () => {
    const response = await handleAvailability(
      new Request("https://example.test/availability?date=2026-06-11", {
        method: "POST",
      }),
      { getAvailability: vi.fn() },
    );

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toMatchObject({
      code: "METHOD_NOT_ALLOWED",
    });
  });

  it("returns DB_ERROR when the availability dependency fails", async () => {
    const response = await handleAvailability(
      new Request("https://example.test/availability?date=2026-06-11"),
      {
        getAvailability: vi.fn().mockRejectedValue(new Error("database down")),
      },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to fetch availability",
      code: "DB_ERROR",
    });
  });

  it("represents a closed day with null hours and no slots", async () => {
    const response = await handleAvailability(
      new Request("https://example.test/availability?date=2026-06-14"),
      {
        getAvailability: vi.fn().mockResolvedValue({
          requested_date: "2026-06-14",
          open_time: null,
          close_time: null,
          slots: [],
        }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      date: "2026-06-14",
      timezone: "Europe/Warsaw",
      open: null,
      close: null,
      slots: [],
    });
  });

  it("documents Warsaw time and formats open-day hours", async () => {
    const response = await handleAvailability(
      new Request("https://example.test/availability?date=2026-06-11"),
      {
        getAvailability: vi.fn().mockResolvedValue({
          requested_date: "2026-06-11",
          open_time: "10:00:00",
          close_time: "19:00:00",
          slots: ["10:00", "10:30"],
        }),
      },
    );

    await expect(response.json()).resolves.toEqual({
      date: "2026-06-11",
      timezone: "Europe/Warsaw",
      open: "10:00",
      close: "19:00",
      slots: ["10:00", "10:30"],
    });
  });

  it("calls get_public_availability and rejects Supabase errors", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "rpc failed" },
    });
    const deps = createAvailabilityDependencies({ rpc });

    await expect(deps.getAvailability("2026-06-11")).rejects.toBeInstanceOf(
      Error,
    );
    expect(rpc).toHaveBeenCalledWith("get_public_availability", {
      p_date: "2026-06-11",
    });
  });
});

function appointmentDependencies(
  overrides: Partial<AppointmentsDependencies> = {},
): AppointmentsDependencies {
  return {
    todayWarsaw: vi.fn().mockReturnValue("2026-06-10"),
    generateLookupToken: vi.fn().mockReturnValue("lookup-token"),
    hashLookupToken: vi.fn().mockResolvedValue("a".repeat(64)),
    createAppointment: vi.fn().mockResolvedValue({
      id: "appointment-id",
      status: "zapytanie",
    }),
    getAppointment: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function appointmentPost(
  body: string,
  contentType = "application/json",
): Request {
  return new Request("https://example.test/appointments", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body,
  });
}

function streamingAppointmentPost(
  body: ReadableStream<Uint8Array>,
  headers: HeadersInit = {},
): Request {
  return new Request("https://example.test/appointments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

describe("appointments handler POST", () => {
  it("rejects request bodies over 8192 UTF-8 bytes", async () => {
    const body = JSON.stringify({
      ...validBody,
      service_note: "\u0105".repeat(4100),
    });
    expect(body.length).toBeLessThan(8192);
    expect(new TextEncoder().encode(body).byteLength).toBeGreaterThan(8192);

    const response = await handleAppointments(
      appointmentPost(body),
      appointmentDependencies(),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
    });
  });

  it("requires an application/json content type", async () => {
    const response = await handleAppointments(
      appointmentPost(JSON.stringify(validBody), "text/plain"),
      appointmentDependencies(),
    );

    expect(response.status).toBe(415);
    await expect(response.json()).resolves.toMatchObject({
      code: "UNSUPPORTED_MEDIA_TYPE",
    });
  });

  it("rejects a valid oversized Content-Length before reading a body", async () => {
    const response = await handleAppointments(
      new Request("https://example.test/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "8193",
        },
      }),
      appointmentDependencies(),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
    });
  });

  it("does not trust an invalid Content-Length value", async () => {
    const response = await handleAppointments(
      new Request("https://example.test/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "8193oops",
        },
      }),
      appointmentDependencies(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_JSON",
    });
  });

  it("cancels a streaming body as soon as it exceeds 8192 bytes", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(8192));
        controller.enqueue(new Uint8Array([1]));
      },
      cancel,
    });

    const response = await handleAppointments(
      streamingAppointmentPost(body),
      appointmentDependencies(),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
    });
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("treats a null request body as invalid JSON", async () => {
    const response = await handleAppointments(
      new Request("https://example.test/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
      appointmentDependencies(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_JSON",
    });
  });

  it("rejects malformed JSON", async () => {
    const response = await handleAppointments(
      appointmentPost("{"),
      appointmentDependencies(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_JSON",
    });
  });

  it("returns shared booking validation problems", async () => {
    const response = await handleAppointments(
      appointmentPost(JSON.stringify({ ...validBody, time: "10:15" })),
      appointmentDependencies(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_TIME",
    });
  });

  it("accepts a JSON charset and returns the raw lookup token once", async () => {
    const createAppointment = vi.fn().mockResolvedValue({
      id: "appointment-id",
      status: "zapytanie",
    });
    const deps = appointmentDependencies({ createAppointment });
    const response = await handleAppointments(
      appointmentPost(
        JSON.stringify(validBody),
        "application/json; charset=utf-8",
      ),
      deps,
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload).toEqual({
      id: "appointment-id",
      status: "zapytanie",
      lookup_token: "lookup-token",
      message: "Appointment inquiry created. The shop will call to confirm.",
    });
    expect(JSON.stringify(payload)).not.toContain("lookup_token_hash");
    expect(createAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_phone_normalized: "48600123456",
        lookup_token_hash: "a".repeat(64),
      }),
    );
  });

  it("maps appointment database conflicts to ApiProblem responses", async () => {
    const createAppointment = vi.fn().mockRejectedValue(
      new ApiProblem("SLOT_TAKEN", 409, "SLOT_TAKEN"),
    );
    const response = await handleAppointments(
      appointmentPost(JSON.stringify(validBody)),
      appointmentDependencies({ createAppointment }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "SLOT_TAKEN",
    });
  });
});

describe("appointments handler GET", () => {
  it("requires X-Customer-Phone", async () => {
    const response = await handleAppointments(
      new Request("https://example.test/appointments", {
        headers: { "X-Lookup-Token": "secret" },
      }),
      appointmentDependencies(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "MISSING_PHONE",
    });
  });

  it("ignores customer credentials supplied only as query parameters", async () => {
    const response = await handleAppointments(
      new Request(
        "https://example.test/appointments?phone=%2B48600123456&token=url-secret",
      ),
      appointmentDependencies(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "MISSING_PHONE",
    });
  });

  it("requires X-Lookup-Token when X-Customer-Phone is present", async () => {
    const response = await handleAppointments(
      new Request("https://example.test/appointments", {
        headers: { "X-Customer-Phone": "+48600123456" },
      }),
      appointmentDependencies(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "MISSING_TOKEN",
    });
  });

  it("returns a generic not-found response for invalid credentials", async () => {
    const response = await handleAppointments(
      new Request("https://example.test/appointments", {
        headers: {
          "X-Customer-Phone": "invalid",
          "X-Lookup-Token": "wrong-token",
        },
      }),
      appointmentDependencies(),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Appointment not found",
      code: "NOT_FOUND",
    });
  });

  it("returns a generic not-found response when no row matches", async () => {
    const getAppointment = vi.fn().mockResolvedValue(null);
    const hashLookupToken = vi.fn().mockResolvedValue("a".repeat(64));
    const response = await handleAppointments(
      new Request("https://example.test/appointments", {
        headers: {
          "x-CuStOmEr-PhOnE": "+48 600-123-456",
          "x-LoOkUp-ToKeN": "header-secret",
        },
      }),
      appointmentDependencies({ getAppointment, hashLookupToken }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Appointment not found",
      code: "NOT_FOUND",
    });
    expect(getAppointment).toHaveBeenCalledWith(
      "48600123456",
      "a".repeat(64),
    );
    expect(hashLookupToken).toHaveBeenCalledWith("header-secret");
  });

  it("returns only explicit customer-facing appointment fields", async () => {
    const getAppointment = vi.fn().mockResolvedValue({
      id: "appointment-id",
      appointment_date: "2026-06-11",
      arrival_time: "10:30:00",
      status: "zapytanie",
      bike_manufacturer: "Trek",
      bike_model: "Fuel EX",
      service_note: "Full service",
      created_at: "2026-06-10T12:00:00Z",
      customer_name: "must not leak",
      customer_phone: "must not leak",
      lookup_token_hash: "must not leak",
      technician_note: "must not leak",
    });
    const response = await handleAppointments(
      new Request("https://example.test/appointments", {
        headers: {
          "X-Customer-Phone": "+48600123456",
          "X-Lookup-Token": "secret",
        },
      }),
      appointmentDependencies({ getAppointment }),
    );

    await expect(response.json()).resolves.toEqual({
      id: "appointment-id",
      date: "2026-06-11",
      time: "10:30",
      status: "zapytanie",
      bike_manufacturer: "Trek",
      bike_model: "Fuel EX",
      service_note: "Full service",
      created_at: "2026-06-10T12:00:00Z",
    });
  });
});

describe("appointments transport and production adapters", () => {
  it("supports OPTIONS and rejects unsupported methods", async () => {
    const deps = appointmentDependencies();
    const options = await handleAppointments(
      new Request("https://example.test/appointments", { method: "OPTIONS" }),
      deps,
    );
    const patch = await handleAppointments(
      new Request("https://example.test/appointments", { method: "PATCH" }),
      deps,
    );

    expect(options.status).toBe(204);
    expect(patch.status).toBe(405);
    await expect(patch.json()).resolves.toMatchObject({
      code: "METHOD_NOT_ALLOWED",
    });
  });

  it("computes the current calendar date in Europe/Warsaw", () => {
    expect(getWarsawDate(new Date("2026-03-28T23:30:00.000Z"))).toBe(
      "2026-03-29",
    );
    expect(getWarsawDate(new Date("2026-10-25T22:30:00.000Z"))).toBe(
      "2026-10-25",
    );
  });

  it("imports handlers under Vitest without executing Deno adapters", () => {
    expect(handleServices).toBeTypeOf("function");
    expect(handleAvailability).toBeTypeOf("function");
    expect(handleAppointments).toBeTypeOf("function");
  });

  it("keeps service-role adapters guarded and on the official npm specifier", () => {
    for (const moduleUrl of [
      new URL("../availability/index.ts", import.meta.url),
      new URL("../appointments/index.ts", import.meta.url),
    ]) {
      const source = readFileSync(moduleUrl, "utf8");
      const guardIndex = source.indexOf('if (typeof Deno !== "undefined"');
      const npmSpecifierIndex = source.indexOf(
        "npm:@supabase/supabase-js@2",
      );

      expect(guardIndex).toBeGreaterThanOrEqual(0);
      expect(npmSpecifierIndex).toBeGreaterThan(guardIndex);
    }
  });

  it("calls the appointment RPCs and maps DRK03 as an ApiProblem", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { code: "DRK03", message: "slot taken" },
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "appointment-id",
            appointment_date: "2026-06-11",
            arrival_time: "10:30:00",
            status: "zapytanie",
            bike_manufacturer: "Trek",
            bike_model: "Fuel EX",
            service_note: "Full service",
            created_at: "2026-06-10T12:00:00Z",
          },
        ],
        error: null,
      });
    const store = createAppointmentStore({ rpc });

    try {
      await store.createAppointment({
        ...validateCreateAppointment(validBody, "2026-06-10"),
        lookup_token_hash: "a".repeat(64),
      });
      throw new Error("Expected createAppointment to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiProblem);
      expect(error).toMatchObject({ code: "SLOT_TAKEN", status: 409 });
    }

    await expect(
      store.getAppointment("48600123456", "a".repeat(64)),
    ).resolves.toMatchObject({ id: "appointment-id" });
    expect(rpc).toHaveBeenNthCalledWith(
      1,
      "create_public_appointment",
      expect.objectContaining({
        p_customer_phone_normalized: "48600123456",
        p_lookup_token_hash: "a".repeat(64),
      }),
    );
    expect(rpc).toHaveBeenNthCalledWith(2, "get_public_appointment", {
      p_phone_normalized: "48600123456",
      p_lookup_token_hash: "a".repeat(64),
    });
  });
});

const calendarRowId = "11111111-1111-4111-8111-111111111111";
const calendarAdminPassword = "server-secret";

const workingHoursRow = {
  id: calendarRowId,
  day_of_week: 1,
  open_time: "10:00:00",
  close_time: "19:00:00",
  is_open: true,
};

const adminAppointmentRow = {
  id: calendarRowId,
  appointment_date: "2026-06-11",
  arrival_time: "10:30:00",
  customer_name: "Jan Kowalski",
  customer_phone: "+48 600-123-456",
  bike_manufacturer: "Trek",
  bike_model: "Fuel EX",
  service_note: "Full service",
  status: "zapytanie",
  estimated_duration_minutes: 60,
  technician_note: "Check the fork",
  source: "online",
  created_at: "2026-06-10T12:00:00Z",
};

const blockedTimeRow = {
  id: calendarRowId,
  block_date: "2026-06-11",
  start_time: "12:00:00",
  end_time: "13:00:00",
  reason: "Lunch",
  created_at: "2026-06-10T12:00:00Z",
};

function calendarDependencies(
  overrides: Partial<CalendarAdminDependencies> = {},
): CalendarAdminDependencies {
  return {
    adminPassword: calendarAdminPassword,
    todayWarsaw: vi.fn().mockReturnValue("2026-06-10"),
    listWorkingHours: vi.fn().mockResolvedValue([workingHoursRow]),
    updateWorkingHours: vi.fn().mockResolvedValue(workingHoursRow),
    listAppointments: vi.fn().mockResolvedValue([adminAppointmentRow]),
    listPendingAppointments: vi.fn().mockResolvedValue([
      adminAppointmentRow,
    ]),
    createAppointment: vi.fn().mockResolvedValue(adminAppointmentRow),
    updateAppointment: vi.fn().mockResolvedValue(adminAppointmentRow),
    listBlockedTimes: vi.fn().mockResolvedValue([blockedTimeRow]),
    createBlockedTime: vi.fn().mockResolvedValue(blockedTimeRow),
    deleteBlockedTime: vi.fn().mockResolvedValue(true),
    ...overrides,
  } as CalendarAdminDependencies;
}

function calendarRequest(
  action: string,
  init: RequestInit = {},
  password: string | null = calendarAdminPassword,
): Request {
  const headers = new Headers(init.headers);
  if (password !== null) {
    headers.set("X-Admin-Password", password);
  }

  return new Request(
    `https://example.test/calendar-admin?action=${action}`,
    { ...init, headers },
  );
}

function calendarJsonRequest(
  action: string,
  method: "POST" | "PATCH",
  body: unknown,
): Request {
  return calendarRequest(action, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function expectNoCalendarDatabaseCalls(
  deps: CalendarAdminDependencies,
): void {
  expect(deps.listWorkingHours).not.toHaveBeenCalled();
  expect(deps.updateWorkingHours).not.toHaveBeenCalled();
  expect(deps.listAppointments).not.toHaveBeenCalled();
  expect(deps.listPendingAppointments).not.toHaveBeenCalled();
  expect(deps.createAppointment).not.toHaveBeenCalled();
  expect(deps.updateAppointment).not.toHaveBeenCalled();
  expect(deps.listBlockedTimes).not.toHaveBeenCalled();
  expect(deps.createBlockedTime).not.toHaveBeenCalled();
  expect(deps.deleteBlockedTime).not.toHaveBeenCalled();
}

describe("calendar admin authentication", () => {
  it.each([
    ["missing header", null, calendarAdminPassword],
    ["wrong password", "wrong-secret", calendarAdminPassword],
    ["missing configuration", calendarAdminPassword, undefined],
  ])(
    "returns the same 401 before routing or database access for %s",
    async (_label, supplied, configured) => {
      const deps = calendarDependencies({ adminPassword: configured });
      const response = await handleCalendarAdmin(
        calendarRequest("unknown-private-action", {}, supplied),
        deps,
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({
        error: "Unauthorized",
        code: "UNAUTHORIZED",
      });
      expectNoCalendarDatabaseCalls(deps);
    },
  );

  it("verifies a correct password without database access", async () => {
    const deps = calendarDependencies();
    const response = await handleCalendarAdmin(
      calendarRequest("verify"),
      deps,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      authenticated: true,
    });
    expectNoCalendarDatabaseCalls(deps);
  });

  it("allows unauthenticated CORS preflight without database access", async () => {
    const deps = calendarDependencies();
    const response = await handleCalendarAdmin(
      calendarRequest("appointments", { method: "OPTIONS" }, null),
      deps,
    );

    expect(response.status).toBe(204);
    expectNoCalendarDatabaseCalls(deps);
  });
});

describe("calendar admin route mapping", () => {
  it("maps GET working-hours and returns explicit fields", async () => {
    const listWorkingHours = vi.fn().mockResolvedValue([
      { ...workingHoursRow, internal_secret: "must not leak" },
    ]);
    const response = await handleCalendarAdmin(
      calendarRequest("working-hours"),
      calendarDependencies({ listWorkingHours }),
    );

    expect(listWorkingHours).toHaveBeenCalledWith();
    await expect(response.json()).resolves.toEqual([workingHoursRow]);
  });

  it("maps PATCH working-hours by validated UUID", async () => {
    const updateWorkingHours = vi.fn().mockResolvedValue(workingHoursRow);
    const response = await handleCalendarAdmin(
      calendarJsonRequest(
        `working-hours&id=${calendarRowId}`,
        "PATCH",
        {
          open_time: "10:00",
          close_time: "19:00",
          is_open: true,
        },
      ),
      calendarDependencies({ updateWorkingHours }),
    );

    expect(updateWorkingHours).toHaveBeenCalledWith(calendarRowId, {
      open_time: "10:00:00",
      close_time: "19:00:00",
      is_open: true,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(workingHoursRow);
  });

  it("accepts current HH:mm:ss working-hour payloads", async () => {
    const updateWorkingHours = vi.fn().mockResolvedValue(workingHoursRow);
    const response = await handleCalendarAdmin(
      calendarJsonRequest(
        `working-hours&id=${calendarRowId}`,
        "PATCH",
        {
          open_time: "10:00:00",
          close_time: "19:00:00",
          is_open: true,
        },
      ),
      calendarDependencies({ updateWorkingHours }),
    );

    expect(response.status).toBe(200);
    expect(updateWorkingHours).toHaveBeenCalledWith(calendarRowId, {
      open_time: "10:00:00",
      close_time: "19:00:00",
      is_open: true,
    });
  });

  it("maps GET appointments by date with all admin component fields", async () => {
    const listAppointments = vi.fn().mockResolvedValue([
      {
        ...adminAppointmentRow,
        customer_phone_normalized: "48600123456",
        lookup_token_hash: "must not leak",
      },
    ]);
    const response = await handleCalendarAdmin(
      calendarRequest("appointments&date=2026-06-11"),
      calendarDependencies({ listAppointments }),
    );

    expect(listAppointments).toHaveBeenCalledWith("2026-06-11");
    await expect(response.json()).resolves.toEqual([adminAppointmentRow]);
  });

  it("maps GET pending appointments", async () => {
    const listPendingAppointments = vi.fn().mockResolvedValue([
      adminAppointmentRow,
    ]);
    const response = await handleCalendarAdmin(
      calendarRequest("pending"),
      calendarDependencies({ listPendingAppointments }),
    );

    expect(listPendingAppointments).toHaveBeenCalledWith();
    await expect(response.json()).resolves.toEqual([adminAppointmentRow]);
  });

  it("maps POST appointments and forces confirmed manual values", async () => {
    const createdRow = {
      ...adminAppointmentRow,
      status: "potwierdzone",
      source: "manual",
      technician_note: null,
    };
    const createAppointment = vi.fn().mockResolvedValue(createdRow);
    const response = await handleCalendarAdmin(
      calendarJsonRequest("appointments", "POST", {
        appointment_date: "2026-06-11",
        arrival_time: "10:30",
        customer_name: " Jan Kowalski ",
        customer_phone: " +48 600-123-456 ",
        bike_manufacturer: " Trek ",
        bike_model: " Fuel EX ",
        service_note: " Full service ",
        estimated_duration_minutes: 60,
      }),
      calendarDependencies({ createAppointment }),
    );

    expect(createAppointment).toHaveBeenCalledWith({
      appointment_date: "2026-06-11",
      arrival_time: "10:30:00",
      customer_name: "Jan Kowalski",
      customer_phone: "+48 600-123-456",
      customer_phone_normalized: "48600123456",
      bike_manufacturer: "Trek",
      bike_model: "Fuel EX",
      service_note: "Full service",
      status: "potwierdzone",
      estimated_duration_minutes: 60,
      technician_note: null,
      source: "manual",
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(createdRow);
  });

  it("accepts the current HH:mm:ss manual appointment payload", async () => {
    const createAppointment = vi.fn().mockResolvedValue({
      ...adminAppointmentRow,
      status: "potwierdzone",
      source: "manual",
    });
    const response = await handleCalendarAdmin(
      calendarJsonRequest("appointments", "POST", {
        appointment_date: "2026-06-11",
        arrival_time: "10:30:00",
        customer_name: "Jan",
        customer_phone: "+48600123456",
        bike_manufacturer: "Trek",
        bike_model: "Fuel EX",
        service_note: null,
        estimated_duration_minutes: 60,
      }),
      calendarDependencies({ createAppointment }),
    );

    expect(response.status).toBe(201);
    expect(createAppointment).toHaveBeenCalledWith(
      expect.objectContaining({ arrival_time: "10:30:00" }),
    );
  });

  it("maps PATCH appointments with only the update allowlist", async () => {
    const updatedRow = {
      ...adminAppointmentRow,
      status: "potwierdzone",
      appointment_date: "2026-06-12",
      arrival_time: "11:00:00",
      estimated_duration_minutes: 90,
      technician_note: "Ready tomorrow",
    };
    const updateAppointment = vi.fn().mockResolvedValue(updatedRow);
    const response = await handleCalendarAdmin(
      calendarJsonRequest(
        `appointments&id=${calendarRowId}`,
        "PATCH",
        {
          status: "potwierdzone",
          appointment_date: "2026-06-12",
          arrival_time: "11:00",
          estimated_duration_minutes: 90,
          technician_note: " Ready tomorrow ",
        },
      ),
      calendarDependencies({ updateAppointment }),
    );

    expect(updateAppointment).toHaveBeenCalledWith(calendarRowId, {
      status: "potwierdzone",
      appointment_date: "2026-06-12",
      arrival_time: "11:00:00",
      estimated_duration_minutes: 90,
      technician_note: "Ready tomorrow",
    });
    await expect(response.json()).resolves.toEqual(updatedRow);
  });

  it("maps GET blocked-times by date", async () => {
    const listBlockedTimes = vi.fn().mockResolvedValue([
      { ...blockedTimeRow, private_value: "must not leak" },
    ]);
    const response = await handleCalendarAdmin(
      calendarRequest("blocked-times&date=2026-06-11"),
      calendarDependencies({ listBlockedTimes }),
    );

    expect(listBlockedTimes).toHaveBeenCalledWith("2026-06-11");
    await expect(response.json()).resolves.toEqual([blockedTimeRow]);
  });

  it("maps POST blocked-times", async () => {
    const createBlockedTime = vi.fn().mockResolvedValue(blockedTimeRow);
    const response = await handleCalendarAdmin(
      calendarJsonRequest("blocked-times", "POST", {
        block_date: "2026-06-11",
        start_time: "12:00",
        end_time: "13:00",
        reason: " Lunch ",
      }),
      calendarDependencies({ createBlockedTime }),
    );

    expect(createBlockedTime).toHaveBeenCalledWith({
      block_date: "2026-06-11",
      start_time: "12:00:00",
      end_time: "13:00:00",
      reason: "Lunch",
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(blockedTimeRow);
  });

  it("accepts minute-resolution HH:mm:ss blocked-time payloads", async () => {
    const createBlockedTime = vi.fn().mockResolvedValue(blockedTimeRow);
    const response = await handleCalendarAdmin(
      calendarJsonRequest("blocked-times", "POST", {
        block_date: "2026-06-11",
        start_time: "12:05:00",
        end_time: "12:25:00",
        reason: null,
      }),
      calendarDependencies({ createBlockedTime }),
    );

    expect(response.status).toBe(201);
    expect(createBlockedTime).toHaveBeenCalledWith({
      block_date: "2026-06-11",
      start_time: "12:05:00",
      end_time: "12:25:00",
      reason: null,
    });
  });

  it("maps DELETE blocked-times by UUID", async () => {
    const deleteBlockedTime = vi.fn().mockResolvedValue(true);
    const response = await handleCalendarAdmin(
      calendarRequest(`blocked-times&id=${calendarRowId}`, {
        method: "DELETE",
      }),
      calendarDependencies({ deleteBlockedTime }),
    );

    expect(deleteBlockedTime).toHaveBeenCalledWith(calendarRowId);
    await expect(response.json()).resolves.toEqual({
      id: calendarRowId,
      deleted: true,
    });
  });

  it.each([
    ["verify", "POST"],
    ["working-hours", "DELETE"],
    ["appointments", "DELETE"],
    ["pending", "PATCH"],
    ["blocked-times", "PATCH"],
  ])("returns 405 for %s with %s", async (action, method) => {
    const deps = calendarDependencies();
    const response = await handleCalendarAdmin(
      calendarRequest(action, { method }),
      deps,
    );

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toEqual({
      error: "Method not allowed",
      code: "METHOD_NOT_ALLOWED",
    });
    expectNoCalendarDatabaseCalls(deps);
  });

  it("returns 404 for an unknown action", async () => {
    const deps = calendarDependencies();
    const response = await handleCalendarAdmin(
      calendarRequest("service_appointments"),
      deps,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Not found",
      code: "NOT_FOUND",
    });
    expectNoCalendarDatabaseCalls(deps);
  });
});

describe("calendar admin validation and errors", () => {
  it.each([
    ["working-hours", "PATCH", "updateWorkingHours"],
    ["appointments", "PATCH", "updateAppointment"],
    ["blocked-times", "DELETE", "deleteBlockedTime"],
  ] as const)(
    "rejects an invalid UUID for %s %s",
    async (action, method, dependencyName) => {
      const deps = calendarDependencies();
      const request = method === "DELETE"
        ? calendarRequest(`${action}&id=not-a-uuid`, { method })
        : calendarJsonRequest(
          `${action}&id=not-a-uuid`,
          method,
          action === "working-hours"
            ? {
              open_time: "10:00",
              close_time: "19:00",
              is_open: true,
            }
            : { status: "potwierdzone" },
        );
      const response = await handleCalendarAdmin(request, deps);

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        code: "INVALID_UUID",
      });
      expect(deps[dependencyName]).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["appointments", "listAppointments"],
    ["blocked-times", "listBlockedTimes"],
  ] as const)(
    "rejects an impossible date for GET %s",
    async (action, dependencyName) => {
      const deps = calendarDependencies();
      const response = await handleCalendarAdmin(
        calendarRequest(`${action}&date=2026-02-30`),
        deps,
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        code: "INVALID_DATE",
      });
      expect(deps[dependencyName]).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      {
        open_time: "10:15",
        close_time: "19:00",
        is_open: true,
      },
      "INVALID_TIME",
    ],
    [
      {
        open_time: "10:30:01",
        close_time: "19:00:00",
        is_open: true,
      },
      "INVALID_TIME",
    ],
    [
      {
        open_time: "19:00",
        close_time: "10:00",
        is_open: true,
      },
      "INVALID_TIME_RANGE",
    ],
    [
      {
        open_time: "10:00",
        close_time: "19:00",
        is_open: true,
        day_of_week: 2,
      },
      "INVALID_FIELDS",
    ],
  ])("rejects invalid working-hours updates", async (body, code) => {
    const deps = calendarDependencies();
    const response = await handleCalendarAdmin(
      calendarJsonRequest(
        `working-hours&id=${calendarRowId}`,
        "PATCH",
        body,
      ),
      deps,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code });
    expect(deps.updateWorkingHours).not.toHaveBeenCalled();
  });

  it.each([
    [{ status: "unknown" }, "INVALID_STATUS"],
    [{ estimated_duration_minutes: 0 }, "INVALID_DURATION"],
    [{ estimated_duration_minutes: 1.5 }, "INVALID_DURATION"],
    [{ estimated_duration_minutes: 1441 }, "INVALID_DURATION"],
    [{ appointment_date: "2026-02-30" }, "INVALID_DATE"],
    [{ appointment_date: "2026-06-09" }, "DATE_PAST"],
    [{ arrival_time: "10:15" }, "INVALID_TIME"],
    [{ arrival_time: "10:30:01" }, "INVALID_TIME"],
    [{}, "INVALID_FIELDS"],
  ])("rejects invalid appointment patches", async (body, code) => {
    const deps = calendarDependencies();
    const response = await handleCalendarAdmin(
      calendarJsonRequest(
        `appointments&id=${calendarRowId}`,
        "PATCH",
        body,
      ),
      deps,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code });
    expect(deps.updateAppointment).not.toHaveBeenCalled();
  });

  it.each([
    [
      {
        appointment_date: "2026-02-30",
        arrival_time: "10:30",
        customer_name: "Jan",
        customer_phone: "+48600123456",
        bike_manufacturer: "Trek",
        bike_model: "Fuel EX",
        service_note: null,
        estimated_duration_minutes: 60,
      },
      "INVALID_DATE",
    ],
    [
      {
        appointment_date: "2026-06-09",
        arrival_time: "10:30",
        customer_name: "Jan",
        customer_phone: "+48600123456",
        bike_manufacturer: "Trek",
        bike_model: "Fuel EX",
        service_note: null,
        estimated_duration_minutes: 60,
      },
      "DATE_PAST",
    ],
    [
      {
        appointment_date: "2026-06-11",
        arrival_time: "10:15",
        customer_name: "Jan",
        customer_phone: "+48600123456",
        bike_manufacturer: "Trek",
        bike_model: "Fuel EX",
        service_note: null,
        estimated_duration_minutes: 60,
      },
      "INVALID_TIME",
    ],
    [
      {
        appointment_date: "2026-06-11",
        arrival_time: "10:30:01",
        customer_name: "Jan",
        customer_phone: "+48600123456",
        bike_manufacturer: "Trek",
        bike_model: "Fuel EX",
        service_note: null,
        estimated_duration_minutes: 60,
      },
      "INVALID_TIME",
    ],
    [
      {
        appointment_date: "2026-06-11",
        arrival_time: "10:30",
        customer_name: "Jan",
        customer_phone: "invalid",
        bike_manufacturer: "Trek",
        bike_model: "Fuel EX",
        service_note: null,
        estimated_duration_minutes: 60,
      },
      "INVALID_PHONE",
    ],
    [
      {
        appointment_date: "2026-06-11",
        arrival_time: "10:30",
        customer_name: "Jan",
        customer_phone: "+48600123456",
        bike_manufacturer: "Trek",
        bike_model: "Fuel EX",
        service_note: null,
        estimated_duration_minutes: 0,
      },
      "INVALID_DURATION",
    ],
    [
      {
        appointment_date: "2026-06-11",
        arrival_time: "10:30",
        customer_name: "Jan",
        customer_phone: "+48600123456",
        bike_manufacturer: "Trek",
        bike_model: "Fuel EX",
        service_note: null,
        estimated_duration_minutes: 60,
        source: "online",
      },
      "INVALID_FIELDS",
    ],
  ])("rejects invalid manual appointment payloads", async (body, code) => {
    const deps = calendarDependencies();
    const response = await handleCalendarAdmin(
      calendarJsonRequest("appointments", "POST", body),
      deps,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code });
    expect(deps.createAppointment).not.toHaveBeenCalled();
  });

  it.each([
    [
      {
        block_date: "2026-02-30",
        start_time: "12:00",
        end_time: "13:00",
        reason: null,
      },
      "INVALID_DATE",
    ],
    [
      {
        block_date: "2026-06-11",
        start_time: "12:00:01",
        end_time: "13:00",
        reason: null,
      },
      "INVALID_TIME",
    ],
    [
      {
        block_date: "2026-06-11",
        start_time: "13:00",
        end_time: "12:00",
        reason: null,
      },
      "INVALID_TIME_RANGE",
    ],
    [
      {
        block_date: "2026-06-11",
        start_time: "12:00",
        end_time: "13:00",
        reason: null,
        arbitrary_column: true,
      },
      "INVALID_FIELDS",
    ],
  ])("rejects invalid blocked-time payloads", async (body, code) => {
    const deps = calendarDependencies();
    const response = await handleCalendarAdmin(
      calendarJsonRequest("blocked-times", "POST", body),
      deps,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code });
    expect(deps.createBlockedTime).not.toHaveBeenCalled();
  });

  it("requires JSON content type for body routes", async () => {
    const deps = calendarDependencies();
    const response = await handleCalendarAdmin(
      calendarRequest("appointments", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "{}",
      }),
      deps,
    );

    expect(response.status).toBe(415);
    await expect(response.json()).resolves.toMatchObject({
      code: "UNSUPPORTED_MEDIA_TYPE",
    });
    expect(deps.createAppointment).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const deps = calendarDependencies();
    const response = await handleCalendarAdmin(
      calendarRequest("appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
      deps,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_JSON",
    });
    expect(deps.createAppointment).not.toHaveBeenCalled();
  });

  it("rejects JSON bodies over 8192 UTF-8 bytes", async () => {
    const deps = calendarDependencies();
    const response = await handleCalendarAdmin(
      calendarJsonRequest("blocked-times", "POST", {
        block_date: "2026-06-11",
        start_time: "12:00",
        end_time: "13:00",
        reason: "\u0105".repeat(4100),
      }),
      deps,
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
    });
    expect(deps.createBlockedTime).not.toHaveBeenCalled();
  });

  it("returns generic database errors without leaking details", async () => {
    const deps = calendarDependencies({
      listAppointments: vi.fn().mockRejectedValue(
        new Error(`database failed with ${calendarAdminPassword}`),
      ),
    });
    const response = await handleCalendarAdmin(
      calendarRequest("appointments&date=2026-06-11"),
      deps,
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      error: "Database operation failed",
      code: "DB_ERROR",
    });
    expect(JSON.stringify(payload)).not.toContain(calendarAdminPassword);
  });

  it.each([
    ["POST", "createAppointment"],
    ["PATCH", "updateAppointment"],
  ] as const)(
    "maps appointment %s unique violations to SLOT_TAKEN",
    async (method, dependencyName) => {
      const deps = calendarDependencies({
        [dependencyName]: vi.fn().mockRejectedValue({
          code: "23505",
          message: `duplicate with ${calendarAdminPassword}`,
        }),
      });
      const request = method === "POST"
        ? calendarJsonRequest("appointments", "POST", {
          appointment_date: "2026-06-11",
          arrival_time: "10:30",
          customer_name: "Jan",
          customer_phone: "+48600123456",
          bike_manufacturer: "Trek",
          bike_model: "Fuel EX",
          service_note: null,
          estimated_duration_minutes: 60,
        })
        : calendarJsonRequest(
          `appointments&id=${calendarRowId}`,
          "PATCH",
          {
            status: "potwierdzone",
            appointment_date: "2026-06-11",
            arrival_time: "10:30",
          },
        );
      const response = await handleCalendarAdmin(request, deps);

      expect(response.status).toBe(409);
      await expect(response.json()).resolves.toEqual({
        error: "Slot taken",
        code: "SLOT_TAKEN",
      });
    },
  );

  it.each([
    ["POST", "createAppointment"],
    ["PATCH", "updateAppointment"],
  ] as const)(
    "keeps non-unique appointment %s failures generic",
    async (method, dependencyName) => {
      const deps = calendarDependencies({
        [dependencyName]: vi.fn().mockRejectedValue({
          code: "XX000",
          message: `database failed with ${calendarAdminPassword}`,
        }),
      });
      const request = method === "POST"
        ? calendarJsonRequest("appointments", "POST", {
          appointment_date: "2026-06-11",
          arrival_time: "10:30",
          customer_name: "Jan",
          customer_phone: "+48600123456",
          bike_manufacturer: "Trek",
          bike_model: "Fuel EX",
          service_note: null,
          estimated_duration_minutes: 60,
        })
        : calendarJsonRequest(
          `appointments&id=${calendarRowId}`,
          "PATCH",
          { status: "potwierdzone" },
        );
      const response = await handleCalendarAdmin(request, deps);

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "Database operation failed",
        code: "DB_ERROR",
      });
    },
  );

  it.each([
    ["working-hours", "PATCH", "updateWorkingHours"],
    ["appointments", "PATCH", "updateAppointment"],
  ] as const)(
    "returns a generic 404 when %s %s finds no row",
    async (action, method, dependencyName) => {
      const deps = calendarDependencies({
        [dependencyName]: vi.fn().mockResolvedValue(null),
      });
      const body = action === "working-hours"
        ? {
          open_time: "10:00",
          close_time: "19:00",
          is_open: true,
        }
        : { status: "potwierdzone" };
      const response = await handleCalendarAdmin(
        calendarJsonRequest(
          `${action}&id=${calendarRowId}`,
          method,
          body,
        ),
        deps,
      );

      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toEqual({
        error: "Not found",
        code: "NOT_FOUND",
      });
    },
  );

  it("returns a generic 404 when a blocked time is not deleted", async () => {
    const response = await handleCalendarAdmin(
      calendarRequest(`blocked-times&id=${calendarRowId}`, {
        method: "DELETE",
      }),
      calendarDependencies({
        deleteBlockedTime: vi.fn().mockResolvedValue(false),
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Not found",
      code: "NOT_FOUND",
    });
  });
});

describe("calendar admin production adapter", () => {
  it("keeps service-role setup guarded, server-only, and non-persistent", () => {
    const moduleUrl = new URL("../calendar-admin/index.ts", import.meta.url);
    const source = readFileSync(moduleUrl, "utf8");
    const guardIndex = source.indexOf('if (typeof Deno !== "undefined"');
    const npmSpecifierIndex = source.indexOf("npm:@supabase/supabase-js@2");

    expect(guardIndex).toBeGreaterThanOrEqual(0);
    expect(npmSpecifierIndex).toBeGreaterThan(guardIndex);
    expect(source).toContain('Deno.env.get("ADMIN_PASSWORD")');
    expect(source).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(source).toContain("persistSession: false");
    expect(source).not.toContain('.select("*")');
    expect(source).not.toContain(".select('*')");
  });
});

describe("Deno module specifiers", () => {
  it("uses explicit .ts extensions for every relative Edge import", () => {
    for (const moduleUrl of [
      new URL("./booking.test.ts", import.meta.url),
      new URL("./admin-auth.ts", import.meta.url),
      new URL("./crypto.test.ts", import.meta.url),
      new URL("../services/index.ts", import.meta.url),
      new URL("../availability/index.ts", import.meta.url),
      new URL("../appointments/index.ts", import.meta.url),
      new URL("../calendar-admin/index.ts", import.meta.url),
    ]) {
      const source = readFileSync(moduleUrl, "utf8");
      const relativeImports = Array.from(
        source.matchAll(
          /(?:from\s+|import\s*\()\s*["'](\.{1,2}\/[^"']+)["']/g,
        ),
        (match) => match[1],
      );

      for (const specifier of relativeImports) {
        expect(specifier, `${moduleUrl.pathname}: ${specifier}`).toMatch(
          /\.ts$/,
        );
      }
    }
  });
});
