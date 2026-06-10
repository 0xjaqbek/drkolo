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

const validBody = {
  date: "2026-06-10",
  time: "10:30",
  customer_name: " Jan ",
  customer_phone: " +48 600-123-456 ",
  bike_manufacturer: " Trek ",
  bike_model: " Fuel EX ",
  service_note: " Full service ",
};

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
      "authorization, apikey, x-client-info, x-admin-password, x-lookup-token, content-type",
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
      "authorization, apikey, x-client-info, x-admin-password, x-lookup-token, content-type",
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
  it("requires the phone query parameter", async () => {
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

  it("requires X-Lookup-Token and ignores a token in the URL", async () => {
    const response = await handleAppointments(
      new Request(
        "https://example.test/appointments?phone=%2B48600123456&token=url-secret",
      ),
      appointmentDependencies(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "MISSING_TOKEN",
    });
  });

  it("returns a generic not-found response for invalid credentials", async () => {
    const response = await handleAppointments(
      new Request(
        "https://example.test/appointments?phone=invalid",
        { headers: { "X-Lookup-Token": "wrong-token" } },
      ),
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
      new Request(
        "https://example.test/appointments?phone=%2B48+600-123-456",
        { headers: { "x-LoOkUp-ToKeN": "header-secret" } },
      ),
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
      new Request(
        "https://example.test/appointments?phone=%2B48600123456",
        { headers: { "X-Lookup-Token": "secret" } },
      ),
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

describe("Deno module specifiers", () => {
  it("uses explicit .ts extensions for every relative Edge import", () => {
    for (const moduleUrl of [
      new URL("./booking.test.ts", import.meta.url),
      new URL("./crypto.test.ts", import.meta.url),
      new URL("../services/index.ts", import.meta.url),
      new URL("../availability/index.ts", import.meta.url),
      new URL("../appointments/index.ts", import.meta.url),
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
